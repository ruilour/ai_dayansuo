from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.message import Message
from app.schemas.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    MessageSend,
    MessageResponse,
)
from app.services.conversation_service import get_conversation_messages
from app.services.ai_service import stream_chat

router = APIRouter(prefix="/api/conversations", tags=["对话"])


def _conv_to_response(c: Conversation) -> ConversationResponse:
    """Conversation ORM → ConversationResponse"""
    return ConversationResponse(
        id=c.id,
        title=c.title,
        is_saved=c.is_saved,
        saved_at=c.saved_at,
        created_at=c.created_at,
        updated_at=c.updated_at,
        message_count=len(c.messages),
        has_post=c.post is not None,
    )


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的所有已保存对话"""
    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.user_id == current_user.id,
            Conversation.is_saved == True,
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [_conv_to_response(c) for c in conversations]


@router.post("", response_model=ConversationResponse)
def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """创建新对话"""
    conversation = Conversation(
        user_id=current_user.id,
        title=request.title,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return _conv_to_response(conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取对话消息列表（只读查看）"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此对话")
    return conversation.messages


@router.post("/{conversation_id}/messages")
async def send_message(
    conversation_id: int,
    request: MessageSend,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """发送消息，以 SSE 流式返回 AI 回答"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权访问此对话")

    # 获取历史消息作为上下文
    history = get_conversation_messages(db, conversation_id)
    # 添加当前用户消息
    history.append({"role": "user", "content": request.content})

    return StreamingResponse(
        stream_chat(history, db, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{conversation_id}/save", response_model=ConversationResponse)
def save_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """保存对话（存入私有库）"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权操作此对话")
    if conversation.is_saved:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="该对话已有保存记录，是否更新？")

    from datetime import datetime, timezone

    # 自动生成标题：取第一条用户消息截断
    if not conversation.title or conversation.title == "新对话":
        first_msg = (
            db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.role == "user",
            )
            .order_by(Message.created_at.asc())
            .first()
        )
        if first_msg:
            conversation.title = (first_msg.content[:50] + "…") if len(first_msg.content) > 50 else first_msg.content

    conversation.is_saved = True
    conversation.saved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(conversation)

    return _conv_to_response(conversation)


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_conversation(
    conversation_id: int,
    body: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """修改对话标题"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权操作此对话")
    if body.title is not None:
        conversation.title = body.title
    db.commit()
    db.refresh(conversation)
    return _conv_to_response(conversation)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """删除对话"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="对话不存在")
    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权删除此对话")
    db.delete(conversation)
    db.commit()
