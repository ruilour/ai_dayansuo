# 防滥用系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现防滥用系统——管理员角色、Turnstile 验证码、内容安全审核、管理后台、接口限流补充。

**Architecture:** 后端扩展 User 模型（角色/状态字段）+ 新增 admin 路由 + 更新 content_safety 服务 + 新增 reports/blocked_words 表。前端新增 /admin/* 路由页面 + 真实 Turnstile 集成。增量修改，不破坏现有功能。

**Tech Stack:** Python FastAPI + SQLAlchemy + MySQL + React + Zustand + Cloudflare Turnstile + bleach/nh3

**设计文档:** `docs/superpowers/specs/2026-06-26-anti-abuse-design.md`

**注意事项:** 已有部分 Turnstile 基础代码但前端使用 dev-skip 占位。注册/login 限流需要调整。通知系统已存在。

**修复项（自审发现的 gap）：**
1. 用户提交举报的 API 不应放在 `/api/admin` 下（普通用户不可达），需在 `posts.py` 或独立路由中提供 `/api/reports` 端点
2. 系统通知（封禁/禁言）的 `post_id` 不能传 0（外键约束），需要使 Notification 模型的 `post_id` 可为空
3. 前端的 PostCard 和 CommentList 需要添加举报按钮入口
4. Post/Comment 模型需要添加 `is_hidden` 字段用于自动隐藏

---

## 文件结构

### 新增文件
```
backend/
  app/
    routes/admin.py              # 管理 API 路由（举报/用户/敏感词/统计）
    models/blocked_word.py       # blocked_words 表模型
    models/report.py             # reports 表模型
    schemas/admin.py             # admin 相关 Pydantic schema

scripts/
  create_admin.py                # 创建初始管理员的种子脚本

frontend/
  src/
    pages/admin/
      AdminDashboard.jsx         # /admin 管理首页
      AdminReports.jsx           # /admin/reports 举报管理
      AdminUsers.jsx             # /admin/users 用户管理
      AdminBlockedWords.jsx      # /admin/blocked-words 敏感词管理
    components/
      TurnstileWidget.jsx        # Turnstile 前端组件
```

### 修改文件
```
backend/
  app/models/user.py             # 新增 role/status/muted_until/banned_until/status_reason 字段
  app/models/__init__.py         # 导入 blocked_word, report 模型
  app/services/content_safety.py # 扩展：HTML 净化 + 重复检测 + AI 审核 + DB 敏感词加载
  app/routes/auth.py             # 调整 Turnstile 触发规则 + 更新限流 + 封禁/禁言检查
  app/routes/posts.py            # 接入更完善的内容安全过滤 + 封禁检查
  app/routes/comments.py         # 接入更完善的内容安全过滤 + 封禁检查 + 禁言检查
  app/routes/bookmarks.py        # 禁言检查
  app/main.py                    # 注册 admin_router
  app/core/security.py           # get_current_user 中检查封禁状态

frontend/
  src/App.jsx                    # 添加 /admin/* 路由（懒加载）
  src/pages/Register.jsx         # 集成真实 Turnstile
  src/pages/Login.jsx            # 集成真实 Turnstile（失败 3 次后才显示）
  src/components/Navbar.jsx      # 管理员可见的「管理后台」入口
```

---

### Task 1: 扩展 User 模型（角色/状态字段）

**Files:**
- Modify: `backend/app/models/user.py` — 新增字段
- Modify: `backend/app/core/security.py` — 在 `get_current_user` 中检查封禁状态
- Test: 手动验证（尚无测试框架，使用 pytest 或 curl）

**Interfaces:**
- Consumes: 现有 User 模型结构
- Produces: User 模型新增 `role`, `status`, `muted_until`, `banned_until`, `status_reason` 字段；`get_current_user()` 增加封禁检查

- [ ] **Step 1: 扩展 User 模型字段**

编辑 `backend/app/models/user.py`，在现有字段后添加：

```python
# 在 class User(Base) 中添加
role = Column(String(20), default="user")       # user / moderator / admin
status = Column(String(20), default="active")   # active / muted / banned
muted_until = Column(DateTime, nullable=True)   # 禁言到期时间
banned_until = Column(DateTime, nullable=True)  # 封禁到期时间
status_reason = Column(String(255), nullable=True)  # 封禁/禁言原因
```

- [ ] **Step 2: 更新 get_current_user 检查封禁**

编辑 `backend/app/core/security.py`，在 `get_current_user` 函数末尾、`return user` 之前添加：

```python
# 封禁检查
from datetime import datetime, timezone
if user.status == "banned":
    if user.banned_until and user.banned_until > datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"账号已被封禁，原因：{user.status_reason or '无'}，到期时间：{user.banned_until.isoformat()}"
        )
    elif user.banned_until and user.banned_until <= datetime.now(timezone.utc):
        # 封禁已到期，自动恢复
        user.status = "active"
        user.banned_until = None
        user.status_reason = None
    else:
        # banned_until 为 null 表示永久封禁
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"账号已被永久封禁，原因：{user.status_reason or '无'}"
        )
```

注意：还需要导入 `from datetime import datetime, timezone`（已有 datetime 导入，timezone 可能需要添加）。

- [ ] **Step 3: 添加禁言检查辅助函数**

在 `backend/app/core/security.py` 末尾添加：

```python
def check_not_muted(user: User):
    """检查用户是否被禁言，被禁言则抛出 403"""
    if user.status == "muted":
        now = datetime.now(timezone.utc)
        if user.muted_until and user.muted_until > now:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被禁言，原因：{user.status_reason or '无'}，到期时间：{user.muted_until.isoformat()}"
            )
        elif user.muted_until and user.muted_until <= now:
            user.status = "active"
            user.muted_until = None
            user.status_reason = None
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"账号已被永久禁言，原因：{user.status_reason or '无'}"
            )
```

- [ ] **Step 4: 在发帖/评论/收藏接口添加禁言检查**

编辑 `backend/app/routes/posts.py`，在 `create_post` 函数开头添加：
```python
from app.core.security import check_not_muted
check_not_muted(current_user)
```

编辑 `backend/app/routes/comments.py`，在 `create_comment` 和 `reply_comment` 函数开头添加同样检查：
```python
from app.core.security import check_not_muted
check_not_muted(current_user)
```

编辑 `backend/app/routes/bookmarks.py`，在 `toggle_bookmark` 函数开头添加同样检查。

- [ ] **Step 5: 使 Notification 模型的 post_id 可为空（用于系统通知）**

编辑 `backend/app/models/notification.py`，将 `post_id` 改为可空：
```python
post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
```

同时更新 `notification_helper.py` 中的 `create_notification` 函数，处理 `post_id` 为 None 的情况：
```python
def create_notification(
    db: Session,
    user_id: int,
    actor_id: int,
    type: str,
    post_id: int | None = None,  # 改为可空
    comment_id: int | None = None,
):
    if user_id == actor_id:
        return
    post_title = None
    if post_id:
        post = db.query(Post).filter(Post.id == post_id).first()
        post_title = post.title[:100] if post and post.title else None
    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        post_id=post_id,
        comment_id=comment_id,
        post_title=post_title,
    )
    db.add(notification)
```

然后在 admin.py 中调用 `create_notification` 传系统通知时使用新增的类型如 `"system_mute"`、`"system_ban"`，并省略 `post_id`。

- [ ] **Step 6: 提交**

```bash
git add backend/app/models/user.py backend/app/models/notification.py backend/app/routes/notification_helper.py backend/app/core/security.py backend/app/routes/posts.py backend/app/routes/comments.py backend/app/routes/bookmarks.py
git commit -m "feat: extend User model with role/status, ban/mute checks, and system notifications"
```

---

### Task 2: 创建 blocked_words 和 reports 表模型

**Files:**
- Create: `backend/app/models/blocked_word.py`
- Create: `backend/app/models/report.py`
- Modify: `backend/app/models/__init__.py`

**Interfaces:**
- Produces: 两个新模型，供后续 task 使用

- [ ] **Step 1: 创建 blocked_word 模型**

`backend/app/models/blocked_word.py`:

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class BlockedWord(Base):
    __tablename__ = "blocked_words"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern = Column(String(255), nullable=False)
    is_regex = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

- [ ] **Step 2: 创建 report 模型**

`backend/app/models/report.py`:

```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)  # post / comment
    target_id = Column(Integer, nullable=False)
    reason = Column(String(50), nullable=False)  # spam / abuse / porn / other
    detail = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending / resolved / dismissed
    handled_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_taken = Column(String(50), nullable=True)  # none / warning / mute / ban
    created_at = Column(DateTime, default=datetime.utcnow)
    handled_at = Column(DateTime, nullable=True)
```

- [ ] **Step 3: 更新 models/__init__.py**

在文件末尾的 `__all__` 列表中添加 `"BlockedWord"` 和 `"Report"`：

```python
from app.models.blocked_word import BlockedWord
from app.models.report import Report

__all__ = ["User", "Conversation", "Message", "Post", "Comment", "PostLike", "PostBookmark", "Notification", "BlockedWord", "Report"]
```

- [ ] **Step 4: 提交**

```bash
git add backend/app/models/blocked_word.py backend/app/models/report.py backend/app/models/__init__.py
git commit -m "feat: add blocked_words and reports table models"
```

---

### Task 3: 创建管理后台 API 路由

**Files:**
- Create: `backend/app/routes/admin.py`
- Create: `backend/app/schemas/admin.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: User（含 role/status）, Report, BlockedWord 模型
- Produces: `/api/admin/*` 路由（举报管理、用户管理、敏感词管理、统计）

- [ ] **Step 1: 创建 admin Pydantic schemas**

`backend/app/schemas/admin.py`:

```python
from datetime import datetime
from pydantic import BaseModel


class AdminReportItem(BaseModel):
    id: int
    reporter_id: int
    reporter_name: str | None = None
    target_type: str
    target_id: int
    reason: str
    detail: str | None = None
    status: str
    action_taken: str | None = None
    created_at: str | None = None
    handled_at: str | None = None

    class Config:
        from_attributes = True


class AdminResolveReport(BaseModel):
    action: str  # dismiss / delete / warning / mute / ban
    duration_hours: int | None = None  # mute/ban 的小时数，null=永久
    reason: str = ""


class AdminUserItem(BaseModel):
    id: int
    username: str
    email: str | None = None
    role: str
    status: str
    muted_until: str | None = None
    banned_until: str | None = None
    status_reason: str | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


class AdminUserStatusUpdate(BaseModel):
    status: str  # active / muted / banned
    duration_hours: int | None = None
    reason: str = ""


class AdminBlockedWordCreate(BaseModel):
    pattern: str
    is_regex: bool = False


class AdminBlockedWordItem(BaseModel):
    id: int
    pattern: str
    is_regex: bool
    created_at: str | None = None

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    pending_reports: int
    total_users: int
    banned_users: int
    muted_users: int
```

- [ ] **Step 2: 创建 admin 路由文件**

`backend/app/routes/admin.py`:

```python
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.blocked_word import BlockedWord
from app.models.comment import Comment
from app.models.post import Post
from app.models.report import Report
from app.models.user import User
from app.routes.notification_helper import create_notification
from app.schemas.admin import (
    AdminBlockedWordCreate,
    AdminBlockedWordItem,
    AdminReportItem,
    AdminResolveReport,
    AdminStatsResponse,
    AdminUserItem,
    AdminUserStatusUpdate,
)

router = APIRouter(prefix="/api/admin", tags=["管理后台"])


def require_admin(current_user: User) -> User:
    """检查用户是否是 admin 或 moderator"""
    if current_user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限")
    return current_user


def require_superadmin(current_user: User) -> User:
    """检查用户是否是 admin"""
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")
    return current_user


# ── 举报管理 ──


@router.get("/reports", response_model=list[AdminReportItem])
def list_reports(
    status_filter: str = Query("pending", alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    query = db.query(Report).filter(Report.status == status_filter).order_by(Report.created_at.desc())
    total = query.count()
    reports = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in reports:
        reporter = db.query(User).filter(User.id == r.reporter_id).first()
        items.append(AdminReportItem(
            id=r.id,
            reporter_id=r.reporter_id,
            reporter_name=reporter.username if reporter else None,
            target_type=r.target_type,
            target_id=r.target_id,
            reason=r.reason,
            detail=r.detail,
            status=r.status,
            action_taken=r.action_taken,
            created_at=r.created_at.isoformat() if r.created_at else None,
            handled_at=r.handled_at.isoformat() if r.handled_at else None,
        ))
    return items


@router.get("/reports/{report_id}")
def get_report_detail(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="举报不存在")
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "detail": report.detail,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }


@router.post("/reports/{report_id}/resolve")
def resolve_report(
    report_id: int,
    body: AdminResolveReport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="举报不存在")
    if report.status != "pending":
        raise HTTPException(status_code=400, detail="该举报已处理")

    # 根据操作执行处罚
    target_user_id = None
    if report.target_type == "post":
        target = db.query(Post).filter(Post.id == report.target_id).first()
        if target:
            target_user_id = target.user_id
    elif report.target_type == "comment":
        target = db.query(Comment).filter(Comment.id == report.target_id).first()
        if target:
            target_user_id = target.user_id

    if body.action in ("delete", "warning", "mute", "ban") and target_user_id:
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if target_user and body.action == "mute":
            target_user.status = "muted"
            target_user.status_reason = body.reason or "违规发言"
            if body.duration_hours:
                target_user.muted_until = datetime.now(timezone.utc).replace(
                    hour=(datetime.now(timezone.utc).hour + body.duration_hours) % 24
                )  # 简化：实际用 timedelta
            # 发送通知给被处罚用户
            create_notification(db, target_user.id, current_user.id, "system_mute")
        elif target_user and body.action == "ban":
            target_user.status = "banned"
            target_user.status_reason = body.reason or "严重违规"
            if body.duration_hours:
                target_user.banned_until = datetime.now(timezone.utc).replace(
                    hour=(datetime.now(timezone.utc).hour + body.duration_hours) % 24
                )
            create_notification(db, target_user.id, current_user.id, "system_ban")

    # 删除违规内容
    if body.action == "delete" and report.target_type == "post":
        post = db.query(Post).filter(Post.id == report.target_id).first()
        if post:
            db.delete(post)
    elif body.action == "delete" and report.target_type == "comment":
        comment = db.query(Comment).filter(Comment.id == report.target_id).first()
        if comment:
            db.query(Comment).filter(Comment.parent_id == comment.id).delete(synchronize_session=False)
            db.delete(comment)

    # 更新举报状态
    report.status = "resolved" if body.action != "dismiss" else "dismissed"
    report.handled_by = current_user.id
    report.action_taken = body.action
    report.handled_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": report.status, "action_taken": body.action}


# ── 用户管理 ──


@router.get("/users", response_model=list[AdminUserItem])
def list_users(
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    query = db.query(User).order_by(User.created_at.desc())
    if search:
        query = query.filter(User.username.ilike(f"%{search}%"))
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for u in users:
        items.append(AdminUserItem(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role,
            status=u.status,
            muted_until=u.muted_until.isoformat() if u.muted_until else None,
            banned_until=u.banned_until.isoformat() if u.banned_until else None,
            status_reason=u.status_reason,
            created_at=u.created_at.isoformat() if u.created_at else None,
        ))
    return items


@router.put("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    body: AdminUserStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    if body.status == "active":
        target.status = "active"
        target.muted_until = None
        target.banned_until = None
        target.status_reason = None
    elif body.status == "muted":
        target.status = "muted"
        target.status_reason = body.reason or "违规发言"
        target.muted_until = datetime.now(timezone.utc).replace(
            hour=(datetime.now(timezone.utc).hour + (body.duration_hours or 24)) % 24
        ) if body.duration_hours else None
    elif body.status == "banned":
        target.status = "banned"
        target.status_reason = body.reason or "严重违规"
        target.banned_until = datetime.now(timezone.utc).replace(
            hour=(datetime.now(timezone.utc).hour + (body.duration_hours or 720)) % 24
        ) if body.duration_hours else None

    db.commit()
    return {"status": target.status}


# ── 统计 ──


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_admin(current_user)
    pending_reports = db.query(Report).filter(Report.status == "pending").count()
    total_users = db.query(User).count()
    banned_users = db.query(User).filter(User.status == "banned").count()
    muted_users = db.query(User).filter(User.status == "muted").count()
    return AdminStatsResponse(
        pending_reports=pending_reports,
        total_users=total_users,
        banned_users=banned_users,
        muted_users=muted_users,
    )


# ── 敏感词管理 ──


@router.get("/blocked-words", response_model=list[AdminBlockedWordItem])
def list_blocked_words(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_superadmin(current_user)
    words = db.query(BlockedWord).order_by(BlockedWord.created_at.desc()).all()
    return [
        AdminBlockedWordItem(
            id=w.id,
            pattern=w.pattern,
            is_regex=w.is_regex,
            created_at=w.created_at.isoformat() if w.created_at else None,
        )
        for w in words
    ]


@router.post("/blocked-words", response_model=AdminBlockedWordItem, status_code=201)
def add_blocked_word(
    body: AdminBlockedWordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_superadmin(current_user)
    word = BlockedWord(pattern=body.pattern, is_regex=body.is_regex)
    db.add(word)
    db.commit()
    db.refresh(word)
    return AdminBlockedWordItem(
        id=word.id,
        pattern=word.pattern,
        is_regex=word.is_regex,
        created_at=word.created_at.isoformat() if word.created_at else None,
    )


@router.delete("/blocked-words/{word_id}", status_code=204)
def delete_blocked_word(
    word_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_superadmin(current_user)
    word = db.query(BlockedWord).filter(BlockedWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="敏感词不存在")
    db.delete(word)
    db.commit()
```

注意：上面 `muted_until` 和 `banned_until` 的 timedelta 计算用了简化写法。实际应该用 `timedelta(hours=...)`。修改：

`target.muted_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours)`（需要 `from datetime import timedelta`）

将 resolve_report 和 update_user_status 中的 `.replace(hour=...)` 替换为正确的 timedelta：

```python
from datetime import timedelta
# ...
target.muted_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None
target.banned_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None
```

- [ ] **Step 3: 注册 admin 路由到 main.py**

在 `backend/app/main.py` 中添加：

```python
from app.routes.admin import router as admin_router
# ...
app.include_router(admin_router)
```

- [ ] **Step 4: 提交**

```bash
git add backend/app/routes/admin.py backend/app/schemas/admin.py backend/app/main.py
git commit -m "feat: add admin API routes for reports, users, blocked-words"
```

---

### Task 4: 更新 Turnstile 验证码集成（登录 3 次失败触发 + 真实 Widget）

**Files:**
- Modify: `backend/app/routes/auth.py` — 调整 Turnstile 触发规则 + 更新限流
- Modify: `frontend/src/pages/Register.jsx` — 真实 Turnstile widget
- Modify: `frontend/src/pages/Login.jsx` — 失败 3 次才显示 Turnstile
- Create: `frontend/src/components/TurnstileWidget.jsx`
- Modify: `frontend/src/hooks/useAuth.js` — 跟踪登录失败次数

**Interfaces:**
- Consumes: 现有 auth 路由 + 前端登录/注册页面
- Produces: 注册页必显示 Turnstile，登录页失败 3 次后显示

- [ ] **Step 1: 创建 TurnstileWidget 前端组件**

`frontend/src/components/TurnstileWidget.jsx`:

```jsx
import { useEffect, useRef } from 'react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA' // dev key

export default function TurnstileWidget({ onVerify, onExpire }) {
  const containerRef = useRef(null)
  const widgetId = useRef(null)

  useEffect(() => {
    // 等待 Turnstile SDK 加载
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(interval)
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onVerify?.(token),
          'expired-callback': () => onExpire?.(),
        })
      }
    }, 200)

    // 加载 SDK（如果未加载）
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    return () => {
      clearInterval(interval)
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
      }
    }
  }, [])

  return <div ref={containerRef} />
}
```

- [ ] **Step 2: 更新 Register.jsx**

替换 Turnstile 占位 checkbox 为真实组件：

```jsx
import TurnstileWidget from '../components/TurnstileWidget'
// ...
const [turnstileToken, setTurnstileToken] = useState('')

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!turnstileToken) return
  try {
    await register(username, password, email, turnstileToken)
  } catch { /* handled */ }
}
```

将对 checkbox 部分的替换为：

```jsx
<TurnstileWidget
  onVerify={(token) => setTurnstileToken(token)}
  onExpire={() => setTurnstileToken('')}
/>
```

按钮的 `disabled` 条件改为 `loading || !turnstileToken`。

同时，在 register 失败后重置 Turnstile（调用 `window.turnstile.reset()`）。

- [ ] **Step 3: 更新 Login.jsx**

Login 页面的改动：
- 添加 `failedAttempts` 状态（从 localStorage 读取）
- 错误时 `failedAttempts + 1` 存入 localStorage
- 仅当 `failedAttempts >= 3` 时渲染 TurnstileWidget
- 登录成功后清除 `failedAttempts`

添加到函数内部：
```jsx
const [failedAttempts, setFailedAttempts] = useState(() => {
  return parseInt(localStorage.getItem('login_failed_attempts') || '0')
})
const [turnstileToken, setTurnstileToken] = useState('')

const handleSubmit = async (e) => {
  e.preventDefault()
  if (failedAttempts >= 3 && !turnstileToken) return
  try {
    await login(username, password, turnstileToken || 'dev-skip')
    localStorage.removeItem('login_failed_attempts')
  } catch {
    const newCount = failedAttempts + 1
    setFailedAttempts(newCount)
    localStorage.setItem('login_failed_attempts', String(newCount))
    setTurnstileToken('')
  }
}
```

条件渲染 Turnstile：
```jsx
{failedAttempts >= 3 && (
  <TurnstileWidget
    onVerify={(token) => setTurnstileToken(token)}
    onExpire={() => setTurnstileToken('')}
  />
)}
```

- [ ] **Step 4: 调整后端 Turnstile 验证逻辑**

编辑 `backend/app/routes/auth.py`：

在 login 端点中，需要知道连续失败次数。可以用 Redis 但简化方案：前端传递 `failed_attempts` 字段，后端据此决定是否验证 Turnstile。

更好的方案：在 UserLogin schema 中添加 `skip_turnstile: bool = False`，前端在失败 < 3 次时传 `skip_turnstile: true`。

修改 `backend/app/schemas/auth.py` 中 `UserLogin`：
```python
class UserLogin(BaseModel):
    username: str
    password: str
    turnstile_token: str = ""
    skip_turnstile: bool = False
```

修改 `auth.py` 中 login 端点的 Turnstile 验证：
```python
@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minute")  # 改为 5次/15分钟
async def login(request: Request, body: UserLogin, db: Session = Depends(get_db)):
    if not body.skip_turnstile:
        if not await verify_turnstile(body.turnstile_token):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="验证码验证失败")
    # ... 继续现有逻辑
```

同时将注册限流从 `5/minute` 改为 `3/hour`：
```python
@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")
```

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/TurnstileWidget.jsx frontend/src/pages/Register.jsx frontend/src/pages/Login.jsx backend/app/routes/auth.py backend/app/schemas/auth.py
git commit -m "feat: integrate Turnstile widget and update rate limits"
```

---

### Task 5: 完善内容安全服务（敏感词 DB + HTML 净化 + 重复检测 + AI 审核 + 举报）

**Files:**
- Modify: `backend/app/services/content_safety.py` — 完整重写
- Modify: `backend/app/routes/posts.py` — 集成新安全检查
- Modify: `backend/app/routes/comments.py` — 集成新安全检查
- Create: `backend/app/routes/reports.py` 或合并到 `backend/app/routes/posts.py` + `comments.py`

**Interfaces:**
- Consumes: BlockedWord 模型, existing ai_service
- Produces: 五层内容安全过滤 + 举报 API

- [ ] **Step 1: 重写 content_safety.py**

`backend/app/services/content_safety.py`:

```python
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
    from app.services.ai_service import chat_with_ai
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
{text[:2000]}  # 只检查前 2000 字符
"""
    try:
        result = await chat_with_ai(prompt)
        import json
        # 从 AI 回复中提取 JSON
        result_text = result if isinstance(result, str) else str(result)
        # 尝试解析 JSON
        json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
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
```

- [ ] **Step 2: 在 posts.py 中集成新安全检查**

编辑 `backend/app/routes/posts.py`，在 `create_post` 函数中添加完整检查：

在内容安全检查处，改为调用 `full_content_check`：

```python
# 在 create_post 中，现有 validate_post_content 之后增加：
from app.services.content_safety import full_content_check

full_text = f"{body.title or ''} {body.summary or ''}"
check_result = await full_content_check(
    text=body.summary or "",
    db=db,
    user_id=current_user.id,
    content_type="post",
    title=body.title,
)
if not check_result["passed"]:
    raise HTTPException(status_code=422, detail=check_result["reason"])
```

注意：现有 `validate_post_content(body.title, body.summary)` 保留做基本验证，新增 `full_content_check` 做深度验证。

- [ ] **Step 3: 在 comments.py 中集成新安全检查**

类似地，在 `create_comment` 和 `reply_comment` 中增加：

```python
from app.services.content_safety import full_content_check, validate_comment_content

# 基本验证
err = validate_comment_content(body.content)
if err:
    raise HTTPException(status_code=422, detail=err)

# 深度检查
check_result = await full_content_check(
    text=body.content,
    db=db,
    user_id=current_user.id,
    content_type="comment",
)
if not check_result["passed"]:
    raise HTTPException(status_code=422, detail=check_result["reason"])
```

注意：现有代码中 `create_comment` 和 `reply_comment` 不是 async 函数，需要改为 async def。

- [ ] **Step 4: 添加前端举报按钮**

在 `frontend/src/pages/PostDetail.jsx` 中添加举报按钮。在帖子内容展示区域附近添加：

```jsx
import api from '../api'
// ...
const [reporting, setReporting] = useState(false)

const handleReport = async (targetType, targetId) => {
  const reason = prompt('举报原因：\n1. 广告 (spam)\n2. 辱骂 (abuse)\n3. 色情 (porn)\n4. 其他 (other)\n\n请输入选项数字或直接输入原因代码：')
  if (!reason) return
  const reasonMap = { '1': 'spam', '2': 'abuse', '3': 'porn', '4': 'other' }
  const reasonCode = reasonMap[reason] || reason
  if (!['spam', 'abuse', 'porn', 'other'].includes(reasonCode)) {
    alert('无效的举报原因')
    return
  }
  setReporting(true)
  try {
    await api.post('/reports', { target_type: targetType, target_id: targetId, reason: reasonCode })
    alert('举报已提交')
  } catch (err) {
    alert(err.response?.data?.detail || '举报失败')
  } finally {
    setReporting(false)
  }
}

// 在操作按钮组中添加：
<button onClick={() => handleReport('post', post.id)} className="btn-ghost text-xs" disabled={reporting}>
  举报
</button>
```

同样在 `frontend/src/components/CommentList.jsx` 的每条评论中添加类似举报按钮。

- [ ] **Step 5: 创建举报 API**

用户提交举报的路由放在 `/api/reports`（普通已登录用户可访问），管理员处理举报的路由在 `/api/admin/reports/*`。

在 `backend/app/routes/posts.py` 末尾添加（或新建 `backend/app/routes/reports.py`）：

```python
# ── 用户举报 ── (添加到 posts.py 末尾，或新建 reports.py)
from pydantic import BaseModel
from app.models.report import Report

class CreateReport(BaseModel):
    target_type: str  # post / comment
    target_id: int
    reason: str  # spam / abuse / porn / other
    detail: str | None = None

report_router = APIRouter(prefix="/api/reports", tags=["举报"])

@report_router.post("", status_code=201)
def create_report(
    body: CreateReport,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """提交举报"""
    if body.reason not in ("spam", "abuse", "porn", "other"):
        raise HTTPException(status_code=422, detail="无效的举报原因")
    if body.target_type not in ("post", "comment"):
        raise HTTPException(status_code=422, detail="无效的举报类型")

    # 检查内容是否存在
    if body.target_type == "post":
        target = db.query(Post).filter(Post.id == body.target_id).first()
    else:
        target = db.query(Comment).filter(Comment.id == body.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="被举报内容不存在")

    # 不能举报自己
    if target.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能举报自己的内容")

    # 检查是否已举报过
    existing = (
        db.query(Report)
        .filter(
            Report.reporter_id == current_user.id,
            Report.target_type == body.target_type,
            Report.target_id == body.target_id,
            Report.status == "pending",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="您已举报过该内容")

    report = Report(
        reporter_id=current_user.id,
        target_type=body.target_type,
        target_id=body.target_id,
        reason=body.reason,
        detail=body.detail,
    )
    db.add(report)
    db.commit()

    # 检查是否达到 3 人举报阈值 → 自动隐藏
    from app.models.post import Post as PostModel
    from app.models.comment import Comment as CommentModel
    pending_count = (
        db.query(Report)
        .filter(
            Report.target_type == body.target_type,
            Report.target_id == body.target_id,
            Report.status == "pending",
        )
        .count()
    )
    if pending_count >= 3:
        if body.target_type == "post":
            t = db.query(PostModel).filter(PostModel.id == body.target_id).first()
        else:
            t = db.query(CommentModel).filter(CommentModel.id == body.target_id).first()
        if t:
            t.is_hidden = True

    db.commit()
    return {"status": "ok", "report_id": report.id}
```

然后在 `backend/app/main.py` 中注册举报路由（如果单独放在 reports.py 中则需要 `app.include_router(report_router)`）。

同时，给 Post 和 Comment 模型添加 `is_hidden` 字段：

`backend/app/models/post.py`：
```python
is_hidden = Column(Boolean, default=False)
```

`backend/app/models/comment.py`（需要读取该文件的当前内容，在类定义中添加）：
```python
is_hidden = Column(Boolean, default=False)
```

然后在帖子列表查询中过滤 `is_hidden == False`：
```python
query = db.query(Post).filter(Post.is_hidden == False).order_by(Post.created_at.desc())
```

评论列表同理：
```python
top_comments = (
    db.query(Comment)
    .filter(Comment.post_id == post_id, Comment.parent_id.is_(None), Comment.is_hidden == False)
    .order_by(Comment.created_at.asc())
    .all()
)
```

- [ ] **Step 6: 提交**

```bash
git add backend/app/services/content_safety.py backend/app/routes/posts.py backend/app/routes/comments.py backend/app/models/post.py backend/app/models/comment.py backend/app/models/report.py backend/app/main.py
git commit -m "feat: enhance content safety with 5-layer check and report system"
```

---

### Task 6: 创建管理后台前端页面

**Files:**
- Create: `frontend/src/pages/admin/AdminDashboard.jsx`
- Create: `frontend/src/pages/admin/AdminReports.jsx`
- Create: `frontend/src/pages/admin/AdminUsers.jsx`
- Create: `frontend/src/pages/admin/AdminBlockedWords.jsx`
- Modify: `frontend/src/App.jsx` — 添加 /admin/* 路由
- Modify: `frontend/src/components/Navbar.jsx` — 管理员入口

**Interfaces:**
- Consumes: 现有 store（user/token）+ 现有 API 客户端
- Produces: 4 个管理页面

- [ ] **Step 1: 创建 AdminDashboard.jsx**

`frontend/src/pages/admin/AdminDashboard.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">管理后台</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{stats?.pending_reports || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>待处理举报</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>总用户</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'oklch(0.58 0.18 30)' }}>{stats?.banned_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>已封禁</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: 'oklch(0.6 0.15 70)' }}>{stats?.muted_users || 0}</div>
          <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>已禁言</div>
        </div>
      </div>
      <div className="grid gap-4">
        <Link to="/admin/reports" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>举报管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
        <Link to="/admin/users" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>用户管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
        <Link to="/admin/blocked-words" className="card p-4 flex items-center justify-between hover:opacity-80">
          <span>敏感词管理</span>
          <span style={{ color: 'var(--color-text-muted)' }}>→</span>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 AdminReports.jsx**

`frontend/src/pages/admin/AdminReports.jsx`:

```jsx
import { useState, useEffect } from 'react'
import api from '../../api'

const STATUS_OPTIONS = ['pending', 'resolved', 'dismissed']
const REASON_LABELS = { spam: '广告', abuse: '辱骂', porn: '色情', other: '其他' }

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)

  const fetchReports = () => {
    setLoading(true)
    api.get(`/admin/reports?status=${statusFilter}`)
      .then(({ data }) => setReports(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [statusFilter])

  const handleResolve = async (reportId, action) => {
    const reason = prompt('处理原因（可选）：') || ''
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { action, reason })
      fetchReports()
    } catch (err) {
      alert(err.response?.data?.detail || '处理失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">举报管理</h1>
      <div className="flex gap-2 mb-4">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? 'btn-primary text-sm' : 'btn-ghost text-sm'}
          >
            {s === 'pending' ? '待处理' : s === 'resolved' ? '已处理' : '已忽略'}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无举报</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium">{REASON_LABELS[r.reason] || r.reason}</span>
                  <span className="text-sm ml-2" style={{ color: 'var(--color-text-muted)' }}>
                    {r.target_type === 'post' ? '帖子' : '评论'} #{r.target_id}
                  </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.created_at}</span>
              </div>
              {r.detail && <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>{r.detail}</p>}
              <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>举报人: {r.reporter_name || r.reporter_id}</div>
              {statusFilter === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleResolve(r.id, 'dismiss')} className="btn-ghost text-xs">忽略</button>
                  <button onClick={() => handleResolve(r.id, 'delete')} className="btn-ghost text-xs" style={{ color: 'oklch(0.58 0.18 30)' }}>删除内容</button>
                  <button onClick={() => handleResolve(r.id, 'mute')} className="btn-ghost text-xs" style={{ color: 'oklch(0.6 0.15 70)' }}>禁言</button>
                  <button onClick={() => handleResolve(r.id, 'ban')} className="btn-ghost text-xs" style={{ color: 'oklch(0.5 0.2 30)' }}>封号</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 创建 AdminUsers.jsx**

`frontend/src/pages/admin/AdminUsers.jsx`:

```jsx
import { useState, useEffect } from 'react'
import api from '../../api'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = (query = '') => {
    setLoading(true)
    api.get(`/admin/users?search=${encodeURIComponent(query)}`)
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers(search)
  }

  const handleStatusChange = async (userId, status, durationHours = null) => {
    const reason = prompt('原因（可选）：') || ''
    try {
      await api.put(`/admin/users/${userId}/status`, { status, duration_hours: durationHours, reason })
      fetchUsers(search)
    } catch (err) {
      alert(err.response?.data?.detail || '操作失败')
    }
  }

  const statusBadge = (status) => {
    const colors = { active: 'green', muted: 'orange', banned: 'red' }
    return <span style={{ color: `var(--color-${colors[status] || 'text-muted'})` }}>{status === 'active' ? '正常' : status === 'muted' ? '禁言' : '封禁'}</span>
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">用户管理</h1>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索用户名..."
          className="flex-1 px-3 py-2 outline-none text-sm rounded-lg"
          style={{
            border: '1px solid var(--color-surface-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-body)',
          }}
        />
        <button type="submit" className="btn-primary text-sm">搜索</button>
      </form>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-3 flex items-center justify-between">
              <div>
                <span className="font-medium">{u.username}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>ID: {u.id}</span>
                <span className="text-xs ml-2">{statusBadge(u.status)}</span>
                {u.status_reason && <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>({u.status_reason})</span>}
              </div>
              <div className="flex gap-1">
                {u.status !== 'active' && (
                  <button onClick={() => handleStatusChange(u.id, 'active')} className="btn-ghost text-xs">解封</button>
                )}
                {u.status === 'active' && (
                  <>
                    <button onClick={() => handleStatusChange(u.id, 'muted', 24)} className="btn-ghost text-xs" style={{ color: 'oklch(0.6 0.15 70)' }}>禁言24h</button>
                    <button onClick={() => handleStatusChange(u.id, 'banned')} className="btn-ghost text-xs" style={{ color: 'oklch(0.5 0.2 30)' }}>封号</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 创建 AdminBlockedWords.jsx**

`frontend/src/pages/admin/AdminBlockedWords.jsx`:

```jsx
import { useState, useEffect } from 'react'
import api from '../../api'

export default function AdminBlockedWords() {
  const [words, setWords] = useState([])
  const [pattern, setPattern] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchWords = () => {
    setLoading(true)
    api.get('/admin/blocked-words')
      .then(({ data }) => setWords(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchWords() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!pattern.trim()) return
    try {
      await api.post('/admin/blocked-words', { pattern: pattern.trim(), is_regex: isRegex })
      setPattern('')
      setIsRegex(false)
      fetchWords()
    } catch (err) {
      alert(err.response?.data?.detail || '添加失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定删除？')) return
    try {
      await api.delete(`/admin/blocked-words/${id}`)
      fetchWords()
    } catch (err) {
      alert(err.response?.data?.detail || '删除失败')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="heading-page mb-6">敏感词管理</h1>
      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="输入敏感词或正则"
          className="flex-1 px-3 py-2 outline-none text-sm rounded-lg"
          style={{
            border: '1px solid var(--color-surface-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-body)',
          }}
        />
        <label className="flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <input type="checkbox" checked={isRegex} onChange={(e) => setIsRegex(e.target.checked)} />
          正则
        </label>
        <button type="submit" className="btn-primary text-sm">添加</button>
      </form>
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>加载中...</div>
      ) : words.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>暂无敏感词</div>
      ) : (
        <div className="space-y-2">
          {words.map(w => (
            <div key={w.id} className="card p-3 flex items-center justify-between">
              <div>
                <code className="text-sm">{w.pattern}</code>
                {w.is_regex && <span className="text-xs ml-2" style={{ color: 'var(--color-brand-500)' }}>正则</span>}
              </div>
              <button onClick={() => handleDelete(w.id)} className="btn-ghost text-xs" style={{ color: 'oklch(0.58 0.18 30)' }}>删除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: 更新 App.jsx 添加 /admin 路由**

```jsx
import { lazy, Suspense } from 'react'
// ... 其他导入

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminBlockedWords = lazy(() => import('./pages/admin/AdminBlockedWords'))

function AdminRoute({ children }) {
  const user = useStore((s) => s.user)
  const token = useStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <Navigate to="/" replace />
  }
  return children
}

// 在 <Routes> 中添加：
<Route path="/admin" element={<AdminRoute><Suspense fallback={<div className="p-8 text-center">加载中...</div>}><AdminDashboard /></Suspense></AdminRoute>} />
<Route path="/admin/reports" element={<AdminRoute><Suspense fallback={<>...</>}><AdminReports /></Suspense></AdminRoute>} />
<Route path="/admin/users" element={<AdminRoute><Suspense fallback={<>...</>}><AdminUsers /></Suspense></AdminRoute>} />
<Route path="/admin/blocked-words" element={<AdminRoute><Suspense fallback={<>...</>}><AdminBlockedWords /></Suspense></AdminRoute>} />
```

- [ ] **Step 6: 更新 Navbar.jsx 添加管理入口**

在用户已登录的区块中，在 `NotificationBell` 之前或之后添加：

```jsx
{user?.role === 'admin' || user?.role === 'moderator' ? (
  <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm"
    style={{ color: 'var(--color-brand-500)' }}>
    管理后台
  </Link>
) : null}
```

- [ ] **Step 7: 提交**

```bash
git add frontend/src/pages/admin/ frontend/src/App.jsx frontend/src/components/Navbar.jsx
git commit -m "feat: add admin dashboard frontend pages"
```

---

### Task 7: 创建管理员种子脚本

**Files:**
- Create: `scripts/create_admin.py`

- [ ] **Step 1: 创建种子脚本**

`scripts/create_admin.py`:

```python
"""创建初始管理员账号"""
import sys
import os

# 添加 backend 到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def create_admin(username: str, password: str):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"用户 '{username}' 已存在，跳过创建")
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"已将 '{username}' 提升为管理员")
            return

        user = User(
            username=username,
            password_hash=get_password_hash(password),
            role="admin",
        )
        db.add(user)
        db.commit()
        print(f"管理员 '{username}' 创建成功")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("用法: python scripts/create_admin.py <username> <password>")
        sys.exit(1)
    create_admin(sys.argv[1], sys.argv[2])
```

- [ ] **Step 2: 提交**

```bash
git add scripts/create_admin.py
git commit -m "feat: add admin seed script"
```

---

### Task 8: 测试与验证

**Files:**
- Run 手动测试

- [ ] **Step 1: 启动后端并验证数据库表创建**

```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
检查数据库是否自动创建了 `blocked_words`、`reports` 表，以及 `users` 表是否新增了字段。

- [ ] **Step 2: 创建管理员账号并测试**

```bash
cd scripts
python create_admin.py admin admin123
```
用该账号登录前端，验证 Navbar 是否显示「管理后台」入口。

- [ ] **Step 3: 测试限流和封禁**

- 用普通账号注册/登录
- 在管理后台将该用户封禁
- 用该账号 token 请求发帖接口 → 应返回 403
- 在管理后台解封 → 恢复正常

- [ ] **Step 4: 测试举报流程**

- 用普通账号打开某个帖子 → 点击举报按钮（需在 UI 中加上举报入口）
- 管理员在后台看到举报 → 处理
- 验证举报人收到通知

- [ ] **Step 5: 测试 Turnstile**

- 注册页 → Turnstile widget 正常显示
- 登录页 → 前 3 次不显示 Turnstile，第 4 次开始显示

- [ ] **Step 6: 最终提交**

```bash
git add -A
git commit -m "feat: complete anti-abuse system implementation"
```
