from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.core.database import Base


class BlockedWord(Base):
    __tablename__ = "blocked_words"

    id = Column(Integer, primary_key=True, autoincrement=True)
    pattern = Column(String(255), nullable=False)
    is_regex = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
