from datetime import datetime

from pydantic import BaseModel


class CommentCreate(BaseModel):
    content: str


class ReplyCreate(BaseModel):
    content: str


class ReplyItem(BaseModel):
    id: int
    content: str
    username: str
    user_id: int
    created_at: str
    parent_id: int

    class Config:
        from_attributes = True


class CommentItem(BaseModel):
    id: int
    content: str
    username: str
    user_id: int
    created_at: str
    replies: list[ReplyItem] = []

    class Config:
        from_attributes = True


class CommentListResponse(BaseModel):
    comments: list[CommentItem]
    total: int
