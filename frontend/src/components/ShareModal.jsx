import { useStore } from '../store/useStore'

export default function ShareModal() {
  const setShowShareModal = useStore((s) => s.setShowShareModal)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowShareModal(false)}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">分享对话</h3>
        <p className="text-sm text-gray-500 mb-4">分享功能即将上线，敬请期待。</p>
        <button
          onClick={() => setShowShareModal(false)}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          关闭
        </button>
      </div>
    </div>
  )
}
