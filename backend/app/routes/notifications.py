from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(tags=["通知"])


@router.get("/api/notifications")
def list_notifications(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取通知列表（最新在前）"""
    query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    total = query.count()
    notifications = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for n in notifications:
        actor = db.query(User).filter(User.id == n.actor_id).first()
        items.append({
            "id": n.id,
            "type": n.type,
            "actor_username": actor.username if actor else "用户",
            "post_id": n.post_id,
            "post_title": n.post_title,
            "comment_id": n.comment_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        })

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "unread_count": sum(1 for n in notifications if not n.is_read), "has_more": has_more}


@router.get("/api/notifications/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """未读通知数量"""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"count": count}


@router.post("/api/notifications/read-all")
def read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全部标为已读"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
