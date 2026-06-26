from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.comment import PostLike
from app.models.post import Post
from app.models.user import User

router = APIRouter(tags=["搜索"])


class SearchItem:
    def __init__(self, post, username, is_liked):
        self.id = post.id
        self.title = post.title
        self.summary = post.summary
        self.username = username
        self.likes_count = post.likes_count
        self.comments_count = post.comments_count
        self.is_liked = is_liked
        self.created_at = post.created_at.isoformat() if post.created_at else ""


@router.get("/api/search")
def search_posts(
    q: str = Query("", min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """按标题或摘要搜索帖子"""
    if not q.strip():
        return {"items": [], "total": 0, "has_more": False}

    keyword = f"%{q.strip()}%"
    query = (
        db.query(Post)
        .filter(
            or_(Post.title.like(keyword), Post.summary.like(keyword))
        )
        .order_by(Post.created_at.desc())
    )

    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        is_liked = False
        if current_user:
            is_liked = (
                db.query(PostLike)
                .filter(
                    PostLike.user_id == current_user.id,
                    PostLike.post_id == p.id,
                )
                .first()
                is not None
            )
        items.append(
            {
                "id": p.id,
                "title": p.title,
                "summary": p.summary,
                "username": p.user.username if p.user else None,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "is_liked": is_liked,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
        )

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "has_more": has_more}
