from datetime import datetime

from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    summary = Column(String(500), nullable=False)
    full_content = Column(Text, nullable=False)
    reasoning_content = Column(Text, nullable=True)
    category = Column(String(20), default="其他", nullable=False)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    bookmarks_count = Column(Integer, default=0)
    is_hidden = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", backref="posts")
    conversation = relationship("Conversation", backref="post")
