import { useEffect } from 'react'
import api from '../api'
import { useStore } from '../store/useStore'
import { IconPlus, IconMessageSquare, IconChevronRight } from './Icons'

export default function ConversationSidebar() {
  const savedConversations = useStore((s) => s.savedConversations)
  const setSavedConversations = useStore((s) => s.setSavedConversations)
  const selectedSavedId = useStore((s) => s.selectedSavedId)
  const setSelectedSavedId = useStore((s) => s.setSelectedSavedId)
  const setCurrentConversation = useStore((s) => s.setCurrentConversation)
  const currentConversation = useStore((s) => s.currentConversation)

  useEffect(() => {
    api.get('/conversations').then(({ data }) => setSavedConversations(data)).catch(() => {})
  }, [])

  const handleSelect = async (conv) => {
    setSelectedSavedId(conv.id)
    try {
      const { data: messages } = await api.get(`/conversations/${conv.id}/messages`)
      setCurrentConversation({
        id: conv.id,
        messages,
        isSaved: true,
        roundCount: messages.filter((m) => m.role === 'user').length,
      })
    } catch { /* ignore */ }
  }

  const handleNewChat = () => {
    setSelectedSavedId(null)
    useStore.getState().clearConversation()
  }

  return (
    <div className="w-64 flex flex-col h-full" style={{ backgroundColor: 'var(--color-surface-card)', borderRight: '1px solid var(--color-surface-border)' }}>
      <div className="p-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
        <button
          onClick={handleNewChat}
          className="btn-primary w-full text-sm"
        >
          <IconPlus className="icon" />
          新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {savedConversations.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-placeholder)' }}>
            暂无已保存的对话
          </p>
        ) : (
          savedConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 flex items-center justify-between gap-2"
              style={{
                backgroundColor: selectedSavedId === conv.id ? 'var(--color-brand-50)' : 'transparent',
                color: selectedSavedId === conv.id ? 'var(--color-brand-700)' : 'var(--color-text-body)',
              }}
              onMouseOver={e => {
                if (selectedSavedId !== conv.id)
                  e.currentTarget.style.backgroundColor = 'var(--color-surface-50)'
              }}
              onMouseOut={e => {
                if (selectedSavedId !== conv.id)
                  e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{conv.title}</div>
                <div className="text-xs mt-0.5" style={{ color: selectedSavedId === conv.id ? 'var(--color-brand-400)' : 'var(--color-text-placeholder)' }}>
                  {conv.message_count} 条消息
                </div>
              </div>
              <IconChevronRight className="icon" style={{ opacity: selectedSavedId === conv.id ? 1 : 0 }} />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
