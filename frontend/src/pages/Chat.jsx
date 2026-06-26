import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import api from '../api'
import ConversationSidebar from '../components/ConversationSidebar'
import ActionButtons from '../components/ActionButtons'
import ShareModal from '../components/ShareModal'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { IconSendHorizonal, IconLoader, IconFlask, IconChevronDown, IconChevronRight, IconMessageSquare } from '../components/Icons'

function ReasoningBlock({ content }) {
  const [expanded, setExpanded] = useState(true)
  if (!content) return null
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs transition-colors mb-1"
        style={{ color: 'var(--color-text-placeholder)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
      >
        {expanded ? <IconChevronDown className="icon" /> : <IconChevronRight className="icon" />}
        思考过程
      </button>
      {expanded && (
        <div
          className="text-sm italic rounded-lg p-3 whitespace-pre-wrap"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface-card)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

function getPlaceholder(conversation) {
  if (conversation.messages.length === 0) return '你想问什么？'
  if (conversation.isSaved) return '继续提问，AI 会记住上下文'
  const count = conversation.roundCount
  if (count === 1) return '当前对话未保存，继续问 AI 可能会忘记前文'
  return `有 ${count} 轮未保存，AI 可能已遗忘部分内容`
}

export default function Chat() {
  const currentConversation = useStore((s) => s.currentConversation)
  const setCurrentConversation = useStore((s) => s.setCurrentConversation)
  const addMessage = useStore((s) => s.addMessage)
  const isStreaming = useStore((s) => s.isStreaming)
  const setIsStreaming = useStore((s) => s.setIsStreaming)
  const streamingReasoning = useStore((s) => s.streamingReasoning)
  const streamingContent = useStore((s) => s.streamingContent)
  const appendStreamingReasoning = useStore((s) => s.appendStreamingReasoning)
  const appendStreamingContent = useStore((s) => s.appendStreamingContent)
  const resetStreaming = useStore((s) => s.resetStreaming)
  const showShareModal = useStore((s) => s.showShareModal)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentConversation.messages, streamingContent])

  const ensureConversation = async () => {
    let convId = currentConversation.id
    if (!convId) {
      const { data } = await api.post('/conversations', { title: '新对话' })
      convId = data.id
      setCurrentConversation({ ...currentConversation, id: convId })
    }
    return convId
  }

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    const message = input.trim()
    setInput('')
    addMessage({ role: 'user', content: message })
    setIsStreaming(true)
    resetStreaming()

    try {
      const convId = await ensureConversation()
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useStore.getState().token}`,
        },
        body: JSON.stringify({ content: message }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'reasoning') {
            appendStreamingReasoning(data.content)
          } else if (data.type === 'content') {
            appendStreamingContent(data.content)
          } else if (data.type === 'done') {
            addMessage({ role: 'assistant', content: useStore.getState().streamingContent, reasoning_content: useStore.getState().streamingReasoning })
            resetStreaming()
            setIsStreaming(false)
          } else if (data.type === 'error') {
            alert(data.content)
            setIsStreaming(false)
          }
        }
      }
    } catch (err) {
      alert('AI 服务暂时不可用，请稍后再试')
      setIsStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ConversationSidebar />

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
          {currentConversation.messages.length === 0 && !isStreaming && (
            <div className="empty-state mt-20 animate-in">
              <IconFlask className="icon" style={{ width: 48, height: 48, color: 'var(--color-surface-disabled)' }} />
              <p className="empty-state-title">你想问 AI 什么问题？</p>
              <p className="empty-state-desc">在下方输入问题，AI 会给出答案</p>
            </div>
          )}

          {currentConversation.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-up`}>
              {msg.role === 'user' ? (
                <div className="bubble-user">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[80%] w-full">
                  {msg.reasoning_content && <ReasoningBlock content={msg.reasoning_content} />}
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* 流式输出区域 */}
          {isStreaming && (
            <div className="flex justify-start animate-in">
              <div className="max-w-[80%] w-full">
                {streamingReasoning && <ReasoningBlock content={streamingReasoning} />}
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{streamingContent}</ReactMarkdown>
                </div>
                <span className="inline-block w-2 h-4 rounded-sm ml-0.5 animate-pulse" style={{ backgroundColor: 'var(--color-brand-500)' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 三按钮 */}
        <ActionButtons />

        {/* 输入框 */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid var(--color-surface-border)', backgroundColor: 'var(--color-surface-card)' }}
        >
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(currentConversation)}
              className="flex-1 px-4 py-2.5 resize-none outline-none text-sm transition-all duration-150"
              style={{
                borderRadius: 'var(--radius-xl, 1rem)',
                border: '1px solid var(--color-surface-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-body)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
              rows={2}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="btn-primary self-end px-4"
              style={{ borderRadius: 'var(--radius-xl, 1rem)', height: 40, width: 40, padding: 0 }}
            >
              {isStreaming ? (
                <IconLoader className="icon" />
              ) : (
                <IconSendHorizonal className="icon" />
              )}
            </button>
          </div>
        </div>
      </div>

      {showShareModal && <ShareModal />}
    </div>
  )
}
