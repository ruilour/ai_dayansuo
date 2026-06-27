from datetime import datetime, timezone, timedelta
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
            target_user.muted_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None
            # 发送通知给被处罚用户
            create_notification(db, target_user.id, current_user.id, "system_mute")
        elif target_user and body.action == "ban":
            target_user.status = "banned"
            target_user.status_reason = body.reason or "严重违规"
            target_user.banned_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None
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
        target.muted_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None
    elif body.status == "banned":
        target.status = "banned"
        target.status_reason = body.reason or "严重违规"
        target.banned_until = datetime.now(timezone.utc) + timedelta(hours=body.duration_hours) if body.duration_hours else None

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
