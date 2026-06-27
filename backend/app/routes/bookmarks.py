from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import check_not_muted, get_current_user
from app.routes.notification_helper import create_notification
from app.models.bookmark import PostBookmark
from app.models.post import Post
from app.models.user import User

router = APIRouter(tags=["收藏"])


class BookmarkResponse(BaseModel):
    bookmarked: bool
    bookmarks_count: int


@router.post("/api/posts/{post_id}/bookmark", response_model=BookmarkResponse)
@limiter.limit("30/hour")
def toggle_bookmark(
    request: Request,
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """切换收藏状态"""
    check_not_muted(current_user, db)
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    existing = (
        db.query(PostBookmark)
        .filter(
            PostBookmark.user_id == current_user.id,
            PostBookmark.post_id == post_id,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        post.bookmarks_count = max(0, post.bookmarks_count - 1)
        db.commit()
        return {"bookmarked": False, "bookmarks_count": post.bookmarks_count}
    else:
        bm = PostBookmark(user_id=current_user.id, post_id=post_id)
        db.add(bm)
        post.bookmarks_count += 1
        create_notification(db, post.user_id, current_user.id, "bookmark", post_id)
        db.commit()
        return {"bookmarked": True, "bookmarks_count": post.bookmarks_count}


@router.get("/api/bookmarks")
def list_bookmarks(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取我收藏的帖子列表"""
    query = (
        db.query(Post)
        .join(PostBookmark, PostBookmark.post_id == Post.id)
        .filter(PostBookmark.user_id == current_user.id)
        .order_by(PostBookmark.created_at.desc())
    )
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        items.append(
            {
                "id": p.id,
                "title": p.title,
                "summary": p.summary,
                "username": p.user.username if p.user else None,
                "category": p.category,
                "likes_count": p.likes_count,
                "comments_count": p.comments_count,
                "bookmarks_count": p.bookmarks_count,
                "is_bookmarked": True,
                "created_at": p.created_at.isoformat() if p.created_at else "",
            }
        )

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "has_more": has_more}
