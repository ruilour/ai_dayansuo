import json

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.message import Message


async def stream_chat(messages: list[dict], db: Session, conversation_id: int):
    """调用 DeepSeek API 流式返回，同时保存消息到数据库"""
    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": messages,
        "stream": True,
    }

    collected_reasoning = ""
    collected_content = ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream("POST", settings.DEEPSEEK_BASE_URL, json=payload, headers=headers) as response:
            if response.status_code != 200:
                error_body = await response.aread()
                error_detail = error_body.decode("utf-8", errors="replace")[:500]
                yield f"data: {json.dumps({'type': 'error', 'content': f'AI 服务错误 ({response.status_code}): {error_detail}'})}\n\n"
                return

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data_str = line[6:].strip()
                if data_str == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})

                    # 处理思考过程
                    reasoning = delta.get("reasoning_content")
                    if reasoning:
                        collected_reasoning += reasoning
                        yield f"data: {json.dumps({'type': 'reasoning', 'content': reasoning})}\n\n"

                    # 处理最终内容
                    content = delta.get("content")
                    if content:
                        collected_content += content
                        yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                except json.JSONDecodeError:
                    continue

    # 流结束，保存到数据库
    user_msg = messages[-1]
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=user_msg["content"],
    )
    db.add(user_message)

    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=collected_content,
        reasoning_content=collected_reasoning if collected_reasoning else None,
    )
    db.add(assistant_message)
    db.commit()

    yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
