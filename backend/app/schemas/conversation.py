from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    title: str = "新对话"


class MessageSend(BaseModel):
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    reasoning_content: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    title: str
    is_saved: bool
    saved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    has_post: bool = False

    class Config:
        from_attributes = True


class ConversationUpdate(BaseModel):
    title: str | None = None


class ConversationSave(BaseModel):
    pass
