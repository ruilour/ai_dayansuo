from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message


def get_conversation_messages(db: Session, conversation_id: int) -> list[dict]:
    """获取对话历史消息，格式化为 DeepSeek API 所需的 messages 格式"""
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    result = []
    for msg in messages:
        result.append({"role": msg.role, "content": msg.content})
    return result
