from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.post import Post
from app.models.user import User
from app.models.comment import PostLike, Comment
from app.models.bookmark import PostBookmark

router = APIRouter(tags=["用户"])


@router.get("/api/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """获取用户基本信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "id": user.id,
        "username": user.username,
        "avatar": user.avatar,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@router.get("/api/users/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """获取用户统计"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    posts_count = db.query(Post).filter(Post.user_id == user_id).count()
    comments_count = db.query(Comment).filter(Comment.user_id == user_id).count()

    # 获赞数 = 该用户所有帖子获得的点赞总和
    total_likes = (
        db.query(PostLike)
        .join(Post, PostLike.post_id == Post.id)
        .filter(Post.user_id == user_id)
        .count()
    )

    return {
        "posts_count": posts_count,
        "comments_count": comments_count,
        "total_likes": total_likes,
    }


@router.get("/api/users/{user_id}/posts")
def get_user_posts(
    user_id: int,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """获取该用户发布的帖子"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    query = (
        db.query(Post)
        .filter(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        is_liked = False
        is_bookmarked = False
        if current_user:
            is_liked = db.query(PostLike).filter(PostLike.user_id == current_user.id, PostLike.post_id == p.id).first() is not None
            is_bookmarked = db.query(PostBookmark).filter(PostBookmark.user_id == current_user.id, PostBookmark.post_id == p.id).first() is not None
        items.append({
            "id": p.id, "title": p.title, "summary": p.summary,
            "username": user.username, "category": p.category,
            "likes_count": p.likes_count, "comments_count": p.comments_count,
            "bookmarks_count": p.bookmarks_count,
            "is_liked": is_liked, "is_bookmarked": is_bookmarked,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        })

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "has_more": has_more}
