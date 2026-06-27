from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.post import Post


def create_notification(
    db: Session,
    user_id: int,
    actor_id: int,
    type: str,
    post_id: int | None = None,
    comment_id: int | None = None,
):
    """创建通知（不自通知：自己操作自己时跳过）"""
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
