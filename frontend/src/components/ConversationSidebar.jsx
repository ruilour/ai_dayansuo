import { useEffect } from 'react'
import api from '../api'
import { useStore } from '../store/useStore'

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
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ✨ 新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {savedConversations.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">暂无已保存的对话</p>
        ) : (
          savedConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelect(conv)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedSavedId === conv.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="truncate font-medium">{conv.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {conv.message_count} 条消息
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
