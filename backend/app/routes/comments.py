from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.limiter import limiter
from app.core.security import check_not_muted, get_current_user
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.routes.notification_helper import create_notification
from app.schemas.comment import (
    CommentCreate,
    CommentItem,
    CommentListResponse,
    ReplyCreate,
    ReplyItem,
)
from app.services.content_safety import validate_comment_content

router = APIRouter(tags=["评论"])


# ── 获取帖子评论（含二级回复） ─────────────────────────────

@router.get("/api/posts/{post_id}/comments", response_model=CommentListResponse)
def list_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    """获取帖子的所有评论，一级评论按时间正序，每个包含二级回复"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    # 获取所有一级评论 (parent_id IS NULL)
    top_comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at.asc())
        .all()
    )

    items = []
    for c in top_comments:
        # 获取该评论的所有二级回复
        replies = (
            db.query(Comment)
            .filter(Comment.parent_id == c.id)
            .order_by(Comment.created_at.asc())
            .all()
        )
        reply_items = [
            ReplyItem(
                id=r.id,
                content=r.content,
                username=r.user.username if r.user else "用户",
                user_id=r.user_id,
                created_at=r.created_at.isoformat() if r.created_at else "",
                parent_id=r.parent_id,
            )
            for r in replies
        ]
        items.append(
            CommentItem(
                id=c.id,
                content=c.content,
                username=c.user.username if c.user else "用户",
                user_id=c.user_id,
                created_at=c.created_at.isoformat() if c.created_at else "",
                replies=reply_items,
            )
        )

    return CommentListResponse(comments=items, total=len(items))


# ── 创建一级评论 ────────────────────────────────────────────

@router.post(
    "/api/posts/{post_id}/comments",
    response_model=CommentItem,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/hour")
def create_comment(
    request: Request,
    post_id: int,
    body: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """对帖子发表一级评论"""
    check_not_muted(current_user)
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    err = validate_comment_content(body.content)
    if err:
        raise HTTPException(status_code=422, detail=err)

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=body.content.strip(),
    )
    db.add(comment)
    post.comments_count += 1
    create_notification(db, post.user_id, current_user.id, "comment", post_id)
    db.commit()
    db.refresh(comment)

    return CommentItem(
        id=comment.id,
        content=comment.content,
        username=current_user.username,
        user_id=current_user.id,
        created_at=comment.created_at.isoformat() if comment.created_at else "",
    )


# ── 回复二级评论 ────────────────────────────────────────────

@router.post(
    "/api/comments/{comment_id}/replies",
    response_model=ReplyItem,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("20/hour")
def reply_comment(
    request: Request,
    comment_id: int,
    body: ReplyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """回复某条评论（创建二级评论）"""
    check_not_muted(current_user)
    parent = db.query(Comment).filter(Comment.id == comment_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="评论不存在")

    err = validate_comment_content(body.content)
    if err:
        raise HTTPException(status_code=422, detail=err)

    reply = Comment(
        post_id=parent.post_id,
        user_id=current_user.id,
        parent_id=comment_id,
        content=body.content.strip(),
    )
    db.add(reply)

    # 更新帖子的评论计数
    post = db.query(Post).filter(Post.id == parent.post_id).first()
    if post:
        post.comments_count += 1

    create_notification(db, parent.user_id, current_user.id, "reply", parent.post_id, parent.id)
    db.commit()
    db.refresh(reply)

    return ReplyItem(
        id=reply.id,
        content=reply.content,
        username=current_user.username,
        user_id=current_user.id,
        created_at=reply.created_at.isoformat() if reply.created_at else "",
        parent_id=reply.parent_id,
    )


# ── 删除评论（只能删自己的） ───────────────────────────────

@router.delete("/api/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除自己的评论（同时删除其二级回复）"""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除他人评论")

    # 统计要删除的评论数（包含二级回复）
    reply_count = (
        db.query(Comment).filter(Comment.parent_id == comment.id).count()
    )
    total_deleted = 1 + reply_count

    # 删除二级回复
    db.query(Comment).filter(Comment.parent_id == comment.id).delete(
        synchronize_session=False
    )
    # 删除主评论
    db.delete(comment)

    # 更新帖子的评论计数
    post = db.query(Post).filter(Post.id == comment.post_id).first()
    if post:
        post.comments_count = max(0, post.comments_count - total_deleted)

    db.commit()
    return None
