import json

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.message import Message


async def _should_trigger_rag(messages: list[dict], cache_bucket: dict | None = None) -> bool:
    """判断是否触发 RAG 检索"""
    if not messages:
        return False
    last_msg = messages[-1].get("content", "")
    # 长度 < 5 的简短回复跳过
    if len(last_msg.strip()) < 5:
        return False
    # 语气词跳过
    filler = {"好", "嗯", "哦", "行", "OK", "ok", "谢谢", "好的", "继续", "然后", "是的", "对"}
    words = set(last_msg.strip().lower().split())
    if words.issubset(filler):
        return False
    # 首条消息始终触发
    if len(messages) <= 1:
        return True
    # 连续 5 条内已检索过则跳过（同对话缓存）
    if cache_bucket and cache_bucket.get("last_rag_turn", -1) >= len(messages) - 5:
        return False
    return True


async def stream_chat(messages: list[dict], db: Session, conversation_id: int):
    """调用 DeepSeek API 流式返回，同时保存消息到数据库"""

    # ── RAG 检索 ──
    rag_context = []
    if await _should_trigger_rag(messages):
        try:
            from app.services.vector_store import rag_search
            last_msg = messages[-1].get("content", "")
            rag_context = await rag_search(last_msg, top_k=5)
        except Exception:
            rag_context = []

    # 构建 system prompt
    system_content = "你是一个 AI 问答助手，请用中文回答用户的问题。"
    if rag_context:
        context_xml_parts = ['<context>']
        for src in rag_context:
            context_xml_parts.append(
                f'  <source post_id="{src["post_id"]}" '
                f'username="{src["username"]}" '
                f'title="{src["title"]}">'
                f'\n    {src["summary"][:500]}'
                f'\n  </source>'
            )
        context_xml_parts.append('</context>')
        system_content += (
            "\n\n以下是社区中与用户问题相关的帖子（<context>），请优先参考这些内容回答。"
            "引用时请在回答末尾标注来源，格式为：\n"
            "> 📚 参考：[帖子标题] · 作者\n"
        )
        system_content += "\n" + "\n".join(context_xml_parts)

    # 构建带 system 的消息列表
    rag_messages = [{"role": "system", "content": system_content}] + messages

    headers = {
        "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.DEEPSEEK_MODEL,
        "messages": rag_messages,
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

    # 如果有 RAG 引用，在最后加 citation 事件
    if rag_context:
        citations = []
        for src in rag_context:
            citations.append({
                "post_id": src["post_id"],
                "title": src["title"],
                "username": src["username"],
            })
        yield f"data: {json.dumps({'type': 'citations', 'content': citations})}\n\n"

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
