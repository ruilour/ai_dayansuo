import { useStore } from '../store/useStore'
import api from '../api'

export default function ActionButtons() {
  const currentConversation = useStore((s) => s.currentConversation)
  const clearConversation = useStore((s) => s.clearConversation)
  const markConversationSaved = useStore((s) => s.markConversationSaved)
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const setShareConversationId = useStore((s) => s.setShareConversationId)

  const handleSave = async () => {
    if (!currentConversation.id) return
    try {
      await api.post(`/conversations/${currentConversation.id}/save`)
      markConversationSaved()
      setShareConversationId(currentConversation.id)
      setShowShareModal(true)
    } catch (err) {
      if (err.response?.status === 409) {
        const confirm = window.confirm('该对话已有保存记录，是否更新？')
        if (confirm) {
          // 重新保存逻辑（先删除再保存 — 简化处理）
          await api.delete(`/conversations/${currentConversation.id}`)
          const { data } = await api.post('/conversations', { title: '新对话' })
          // 重新发送消息...
          alert('请在新对话中继续')
        }
      } else {
        alert('保存失败，请重试')
      }
    }
  }

  const handleContinue = () => {
    const input = document.querySelector('textarea')
    if (input) {
      input.placeholder = '⚠️ 当前对话未保存，继续问 AI 可能会忘记前文'
      input.focus()
    }
  }

  const handleNewTopic = () => {
    clearConversation()
  }

  if (currentConversation.messages.length === 0) return null

  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button
        onClick={handleSave}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-500 transition-colors"
      >
        💾 存入
      </button>
      <button
        onClick={handleContinue}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        💬 继续聊
      </button>
      <button
        onClick={handleNewTopic}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-500 transition-colors"
      >
        📂 新话题
      </button>
    </div>
  )
}
