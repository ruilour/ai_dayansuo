import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function ShareModal() {
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const shareConversationId = useStore((s) => s.shareConversationId)
  const [publishing, setPublishing] = useState(false)

  const handlePublish = async () => {
    setPublishing(true)
    // Phase 2 将实现实际的发布逻辑
    setTimeout(() => {
      setPublishing(false)
      setShowShareModal(false)
    }, 1000)
  }

  const handleKeepPrivate = () => {
    setShowShareModal(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">✅</div>
          <h2 className="text-lg font-semibold text-gray-800">已存入你的档案</h2>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
              placeholder="AI 自动生成（Phase 2）"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">摘要</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 resize-none"
              rows={3}
              placeholder="AI 自动生成（Phase 2）"
              disabled
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? '发布中...' : '📢 发到广场'}
          </button>
          <button
            onClick={handleKeepPrivate}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            🔒 仅自己可见
          </button>
        </div>
      </div>
    </div>
  )
}
