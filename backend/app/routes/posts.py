from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db

router = APIRouter(prefix="/api/posts", tags=["帖子"])


class PostItem(BaseModel):
    id: int
    title: str
    summary: str
    username: str | None
    likes_count: int
    comments_count: int

    class Config:
        from_attributes = True


class PostListResponse(BaseModel):
    items: list[PostItem]
    next_page: int | None
    has_more: bool


@router.get("", response_model=PostListResponse)
def list_posts(page: int = 1, page_size: int = 10, db: Session = Depends(get_db)):
    """获取帖子列表（Phase 2 完整实现，目前返回空列表）"""
    return PostListResponse(items=[], next_page=None, has_more=False)
