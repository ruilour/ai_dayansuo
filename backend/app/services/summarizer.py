"""使用 DeepSeek 为对话生成标题和摘要"""
import json
import re

import httpx

from app.core.config import settings


async def generate_summary(messages: list[dict]) -> dict:
    """根据对话消息生成标题和摘要

    返回: {"title": str, "summary": str}
    """
    # 取最后 10 条消息作为摘要依据
    recent = messages[-10:] if len(messages) > 10 else messages
    conversation_text = "\n".join([
        f"{'用户' if m['role'] == 'user' else 'AI'}: {m['content'][:800]}"
        for m in recent
    ])

    prompt = f"""基于以下对话内容，生成：

1. **标题**：概括核心问题或主题，不超过 50 字
2. **摘要**：提炼关键信息和结论，不超过 200 字

只返回 JSON，不要多余内容。

对话内容：
{conversation_text}

JSON 格式：
{{"title": "标题", "summary": "摘要"}}
"""
    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "max_tokens": 512,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            settings.DEEPSEEK_BASE_URL, json=payload, headers=headers
        )
        resp.raise_for_status()
        result = resp.json()
        content = result["choices"][0]["message"]["content"]

        # 尝试从返回中提取 JSON
        try:
            json_match = re.search(r"\{[^}]+\}", content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                title = data.get("title", "").strip()[:50]
                summary = data.get("summary", "").strip()[:200]
                if title or summary:
                    return {"title": title or "AI 对话分享", "summary": summary or "来自 AI答研所 的对话分享"}
        except (json.JSONDecodeError, AttributeError):
            pass

        # 兜底：取前 50 / 200 字
        lines = content.strip().split("\n")
        fallback_title = lines[0][:50] if lines else "AI 对话分享"
        fallback_summary = content[:200] if content else "来自 AI答研所 的对话分享"
        return {"title": fallback_title, "summary": fallback_summary}
