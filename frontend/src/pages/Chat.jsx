import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import api from '../api'
import ConversationSidebar from '../components/ConversationSidebar'
import ActionButtons from '../components/ActionButtons'
import ShareModal from '../components/ShareModal'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

function ReasoningBlock({ content }) {
  const [expanded, setExpanded] = useState(true)
  if (!content) return null
  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-1"
      >
        {expanded ? '▾' : '▸'} 思考过程
      </button>
      {expanded && (
        <div className="text-sm text-gray-500 italic bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  )
}

function getPlaceholder(conversation) {
  if (conversation.messages.length === 0) return '💬 你想问什么？'
  if (conversation.isSaved) return '💬 继续提问，AI 会记住上下文'
  const count = conversation.roundCount
  if (count === 1) return '⚠️ 当前对话未保存，继续问 AI 可能会忘记前文'
  return `⚠️ 有 ${count} 轮未保存，AI 可能已遗忘部分内容`
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
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {currentConversation.messages.length === 0 && !isStreaming && (
            <div className="text-center text-gray-400 mt-20">
              <div className="text-5xl mb-4">🧪</div>
              <p className="text-lg">你想问 AI 什么问题？</p>
              <p className="text-sm mt-2">在下方输入问题，AI 会给出答案</p>
            </div>
          )}

          {currentConversation.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5' : 'w-full'}`}>
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    {msg.reasoning_content && <ReasoningBlock content={msg.reasoning_content} />}
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 流式输出区域 */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[80%] w-full">
                {streamingReasoning && <ReasoningBlock content={streamingReasoning} />}
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{streamingContent}</ReactMarkdown>
                </div>
                <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 三按钮 */}
        <ActionButtons />

        {/* 输入框 */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(currentConversation)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              rows={2}
              disabled={isStreaming}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
            >
              {isStreaming ? (
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                '发送'
              )}
            </button>
          </div>
        </div>
      </div>

      {showShareModal && <ShareModal />}
    </div>
  )
}
