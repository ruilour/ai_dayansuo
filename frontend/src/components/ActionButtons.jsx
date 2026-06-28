import { useStore } from '../store/useStore'
import api from '../api'
import { IconSave, IconMessageSquare, IconPlus } from './Icons'

export default function ActionButtons() {
  const currentConversation = useStore((s) => s.currentConversation)
  const clearConversation = useStore((s) => s.clearConversation)
  const markConversationSaved = useStore((s) => s.markConversationSaved)
  const triggerSidebarRefresh = useStore((s) => s.triggerSidebarRefresh)
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const setShareConversationId = useStore((s) => s.setShareConversationId)

  const handleSave = async () => {
    if (!currentConversation.id) return
    try {
      await api.post(`/conversations/${currentConversation.id}/save`)
      markConversationSaved()
    } catch (err) {
      if (err.response?.status !== 409) {
        alert('保存失败，请重试')
        return
      }
    }
    triggerSidebarRefresh()
    setShareConversationId(currentConversation.id)
    setShowShareModal(true)
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
    <div className="flex items-center justify-center gap-3 py-3 px-4">
      <button onClick={handleSave} className="btn-primary text-sm">
        <IconSave className="icon" />
        存入
      </button>
      <button
        onClick={handleContinue}
        className="btn-ghost text-sm font-medium"
        style={{
          backgroundColor: 'var(--color-brand-500)',
          color: 'white',
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-brand-400)'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-brand-500)'}
      >
        <IconMessageSquare className="icon" />
        继续聊
      </button>
      <button onClick={handleNewTopic} className="btn-secondary text-sm">
        <IconPlus className="icon" />
        新话题
      </button>
    </div>
  )
}
