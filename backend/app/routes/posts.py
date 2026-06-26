from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.models.bookmark import PostBookmark
from app.models.comment import PostLike
from app.models.conversation import Conversation
from app.models.post import Post
from app.models.user import User
from app.routes.notification_helper import create_notification
from app.services.summarizer import generate_summary

router = APIRouter(prefix="/api/posts", tags=["帖子"])


# ── Schemas ──────────────────────────────────────────────

class PostCreate(BaseModel):
    conversation_id: int
    title: str | None = None
    summary: str | None = None
    category: str = "其他"


class PostItem(BaseModel):
    id: int
    title: str
    summary: str
    category: str
    username: str | None
    likes_count: int
    comments_count: int
    bookmarks_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False
    created_at: str

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    items: list[PostItem]
    next_page: int | None
    has_more: bool


class PostDetail(BaseModel):
    id: int
    title: str
    summary: str
    category: str
    full_content: str
    reasoning_content: str | None
    username: str | None
    likes_count: int
    comments_count: int
    bookmarks_count: int = 0
    is_liked: bool = False
    is_bookmarked: bool = False
    created_at: str

    class Config:
        from_attributes = True


class LikeResponse(BaseModel):
    liked: bool
    likes_count: int


# ── 获取帖子列表 ─────────────────────────────────────────

@router.get("", response_model=PostListResponse)
def list_posts(
    page: int = 1,
    page_size: int = 10,
    category: str | None = None,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """获取帖子列表（未登录也可查看）"""
    query = db.query(Post).order_by(Post.created_at.desc())
    if category:
        query = query.filter(Post.category == category)
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        is_liked = False
        is_bookmarked = False
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
            is_bookmarked = (
                db.query(PostBookmark)
                .filter(
                    PostBookmark.user_id == current_user.id,
                    PostBookmark.post_id == p.id,
                )
                .first()
                is not None
            )
        items.append(
            PostItem(
                id=p.id,
                title=p.title,
                summary=p.summary,
                category=p.category,
                username=p.user.username if p.user else None,
                likes_count=p.likes_count,
                comments_count=p.comments_count,
                bookmarks_count=p.bookmarks_count,
                is_liked=is_liked,
                is_bookmarked=is_bookmarked,
                created_at=p.created_at.isoformat() if p.created_at else "",
            )
        )

    has_more = (page * page_size) < total
    next_page = page + 1 if has_more else None

    return PostListResponse(items=items, next_page=next_page, has_more=has_more)


# ── 发布帖子 ─────────────────────────────────────────────

@router.post("", response_model=PostItem, status_code=status.HTTP_201_CREATED)
async def create_post(
    request: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """从已保存的对话创建帖子"""
    conversation = (
        db.query(Conversation)
        .filter(Conversation.id == request.conversation_id)
        .first()
    )
    if not conversation:
        raise HTTPException(status_code=404, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此对话")
    if not conversation.is_saved:
        raise HTTPException(status_code=400, detail="请先保存对话")

    # 检查是否已发布过
    existing = (
        db.query(Post)
        .filter(Post.conversation_id == conversation.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="该对话已发布过")

    # 组装完整对话内容
    messages = conversation.messages
    parts = []
    reasoning_content = None
    for m in messages:
        role_label = "🧑 用户" if m.role == "user" else "🤖 AI答研所"
        parts.append(f"### {role_label}\n{m.content}")
        if m.role == "assistant" and m.reasoning_content and not reasoning_content:
            reasoning_content = m.reasoning_content
    full_content = "\n\n---\n\n".join(parts)

    # 生成标题和摘要
    title = request.title
    summary = request.summary
    if not title or not summary:
        try:
            ai_result = await generate_summary(
                [{"role": m.role, "content": m.content} for m in messages]
            )
            if not title:
                title = ai_result.get("title", "AI 对话分享")[:255]
            if not summary:
                summary = ai_result.get("summary", "")[:500]
        except Exception:
            if not title:
                title = "AI 对话分享"
            if not summary:
                summary = "来自 AI答研所 的对话分享"

    post = Post(
        user_id=current_user.id,
        conversation_id=conversation.id,
        title=title,
        summary=summary,
        full_content=full_content,
        reasoning_content=reasoning_content,
        category=request.category,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return PostItem(
        id=post.id,
        title=post.title,
        summary=post.summary,
        category=post.category,
        username=current_user.username,
        likes_count=0,
        comments_count=0,
        bookmarks_count=0,
        is_liked=False,
        is_bookmarked=False,
        created_at=post.created_at.isoformat() if post.created_at else "",
    )


# ── 获取帖子详情 ─────────────────────────────────────────

@router.get("/{post_id}", response_model=PostDetail)
def get_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """获取帖子详情"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    is_liked = False
    is_bookmarked = False
    if current_user:
        is_liked = (
            db.query(PostLike)
            .filter(
                PostLike.user_id == current_user.id,
                PostLike.post_id == post.id,
            )
            .first()
            is not None
        )
        is_bookmarked = (
            db.query(PostBookmark)
            .filter(
                PostBookmark.user_id == current_user.id,
                PostBookmark.post_id == post.id,
            )
            .first()
            is not None
        )

    return PostDetail(
        id=post.id,
        title=post.title,
        summary=post.summary,
        category=post.category,
        full_content=post.full_content,
        reasoning_content=post.reasoning_content,
        username=post.user.username if post.user else None,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        bookmarks_count=post.bookmarks_count,
        is_liked=is_liked,
        is_bookmarked=is_bookmarked,
        created_at=post.created_at.isoformat() if post.created_at else "",
    )


# ── 切换点赞 ─────────────────────────────────────────────

@router.post("/{post_id}/like", response_model=LikeResponse)
def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """切换点赞状态（已赞则取消，未赞则点赞）"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    existing_like = (
        db.query(PostLike)
        .filter(
            PostLike.user_id == current_user.id,
            PostLike.post_id == post_id,
        )
        .first()
    )

    if existing_like:
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        db.commit()
        return LikeResponse(liked=False, likes_count=post.likes_count)
    else:
        like = PostLike(user_id=current_user.id, post_id=post_id)
        db.add(like)
        post.likes_count += 1
        create_notification(db, post.user_id, current_user.id, "like", post_id)
        db.commit()
        return LikeResponse(liked=True, likes_count=post.likes_count)
