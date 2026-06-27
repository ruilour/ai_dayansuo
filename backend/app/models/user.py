from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    avatar = Column(String(255), nullable=True)
    role = Column(String(20), default="user")       # user / moderator / admin
    status = Column(String(20), default="active")   # active / muted / banned
    muted_until = Column(DateTime, nullable=True)   # 禁言到期时间
    banned_until = Column(DateTime, nullable=True)  # 封禁到期时间
    status_reason = Column(String(255), nullable=True)  # 封禁/禁言原因
    created_at = Column(DateTime, default=datetime.utcnow)
