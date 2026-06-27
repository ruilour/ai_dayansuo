from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)  # post / comment
    target_id = Column(Integer, nullable=False)
    reason = Column(String(50), nullable=False)  # spam / abuse / porn / other
    detail = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending / resolved / dismissed
    handled_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action_taken = Column(String(50), nullable=True)  # none / warning / mute / ban
    created_at = Column(DateTime, default=datetime.utcnow)
    handled_at = Column(DateTime, nullable=True)
