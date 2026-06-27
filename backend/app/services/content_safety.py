"""内容安全过滤：5层过滤架构"""

import hashlib
import re
from datetime import datetime, timezone, timedelta

from sqlalchemy.orm import Session

from app.models.blocked_word import BlockedWord


# 安全的 HTML 标签允许列表
ALLOWED_TAGS = {"b", "i", "code", "pre", "strong", "em", "p", "br"}
ALLOWED_ATTRS = {}  # 不允许任何属性


def clean_html(text: str) -> str:
    """第3层：HTML 净化 — 只允许安全标签"""
    try:
        import nh3
        return nh3.clean(text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS)
    except ImportError:
        try:
            import bleach
            return bleach.clean(text, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRS, strip=True)
        except ImportError:
            # 回退：用正则去除所有 HTML 标签
            return re.sub(r'<[^>]+>', '', text)


def compute_content_hash(text: str) -> str:
    """计算内容哈希（用于重复检测）"""
    normalized = re.sub(r'\s+', ' ', text.strip()).lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def check_duplicate_content(db: Session, user_id: int, content_hash: str) -> bool:
    """第4层：重复内容检测 — 同一用户5分钟内发布相同文本"""
    from app.models.post import Post
    from app.models.comment import Comment
    five_minutes_ago = datetime.now(timezone.utc) - timedelta(minutes=5)

    # 检查帖子
    recent_post = (
        db.query(Post)
        .filter(
            Post.user_id == user_id,
            Post.created_at >= five_minutes_ago,
        )
        .all()
    )
    for p in recent_post:
        if compute_content_hash(p.title + " " + (p.summary or "")) == content_hash:
            return True

    # 检查评论
    recent_comment = (
        db.query(Comment)
        .filter(
            Comment.user_id == user_id,
            Comment.created_at >= five_minutes_ago,
        )
        .all()
    )
    for c in recent_comment:
        if compute_content_hash(c.content) == content_hash:
            return True

    return False


def load_blocked_patterns_from_db(db: Session) -> list[re.Pattern]:
    """从数据库加载敏感词正则"""
    words = db.query(BlockedWord).all()
    patterns = []
    for w in words:
        try:
            if w.is_regex:
                patterns.append(re.compile(w.pattern, re.IGNORECASE))
            else:
                patterns.append(re.compile(re.escape(w.pattern), re.IGNORECASE))
        except re.error:
            continue  # 跳过无效的正则
    return patterns


def has_blocked_content_from_db(text: str, patterns: list[re.Pattern]) -> bool:
    """检查文本是否匹配敏感词"""
    return any(p.search(text) for p in patterns)


async def ai_review_content(text: str) -> dict:
    """第5层：AI 审核 — 调用内置 AI 模型判断是否违规"""
    import json
    import httpx
    from app.core.config import settings

    prompt = f"""请审核以下内容是否违规。只需要返回一个 JSON 对象，不要返回其他内容：
{{
  "is_abuse": true/false,
  "categories": [],
  "score": 0-100,
  "reason": "简要说明"
}}
违规类别：spam（广告）, abuse（辱骂）, porn（色情）, other（其他违规）
评分越高越可能违规，超过 70 分建议标记为可疑。

内容：
{text[:2000]}"""
    try:
        if not settings.DEEPSEEK_API_KEY:
            return {"is_abuse": False, "categories": [], "score": 0, "reason": "AI 审核未配置"}
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                settings.DEEPSEEK_BASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.DEEPSEEK_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
    except Exception:
        pass
    return {"is_abuse": False, "categories": [], "score": 0, "reason": "审核失败，默认通过"}


async def full_content_check(
    text: str,
    db: Session,
    user_id: int,
    content_type: str = "post",  # post / comment
    title: str | None = None,
) -> dict:
    """执行完整5层内容检查，返回检查结果"""
    full_text = f"{title} {text}" if title else text

    # 第1层：空内容（由调用方做，此处略）

    # 第2层：敏感词
    patterns = load_blocked_patterns_from_db(db)
    if has_blocked_content_from_db(full_text, patterns):
        return {"passed": False, "reason": "内容包含违规词汇", "layer": 2}

    # 第3层：HTML 净化（返回净化后的文本）
    cleaned_text = clean_html(full_text)
    if cleaned_text != full_text:
        return {"passed": False, "reason": "内容包含不允许的 HTML 标签", "layer": 3}

    # 第4层：重复检测
    content_hash = compute_content_hash(full_text)
    if check_duplicate_content(db, user_id, content_hash):
        return {"passed": False, "reason": "检测到重复内容，请勿重复发布", "layer": 4}

    # 第5层：AI 审核
    ai_result = await ai_review_content(full_text)
    if ai_result.get("is_abuse") or ai_result.get("score", 0) > 70:
        return {"passed": False, "reason": "内容被 AI 审核标记为违规", "layer": 5, "ai_result": ai_result}

    return {"passed": True, "reason": None, "layer": 0}


def is_empty_or_whitespace(text: str | None) -> bool:
    return not text or not text.strip()


def validate_post_content(title: str | None, summary: str | None) -> str | None:
    """保留原有接口（兼容性），后需迁移到 full_content_check"""
    if is_empty_or_whitespace(title):
        return "标题不能为空"
    if len(title.strip()) < 2:
        return "标题至少需要 2 个字符"
    if len(title.strip()) > 200:
        return "标题不能超过 200 个字符"
    if summary and len(summary.strip()) > 1000:
        return "摘要不能超过 1000 个字符"
    return None


def validate_comment_content(content: str) -> str | None:
    """保留原有接口（兼容性）"""
    if is_empty_or_whitespace(content):
        return "评论内容不能为空"
    if len(content.strip()) < 1:
        return "评论内容不能为空"
    if len(content.strip()) > 2000:
        return "评论内容不能超过 2000 个字符"
    return None
