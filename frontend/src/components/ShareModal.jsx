import { useState } from 'react'
import { useStore } from '../store/useStore'
import api from '../api'
import { IconCheck, IconShare2, IconLock, IconX, IconLoader, IconArchive } from './Icons'

export default function ShareModal() {
  const setShowShareModal = useStore((s) => s.setShowShareModal)
  const shareConversationId = useStore((s) => s.shareConversationId)
  const currentConversation = useStore((s) => s.currentConversation)

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('其他')
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('success') // success | form | done

  const handlePublish = async () => {
    if (!shareConversationId) return
    setPublishing(true)
    setError('')
    try {
      await api.post('/posts', {
        conversation_id: shareConversationId,
        title: title.trim() || undefined,
        summary: summary.trim() || undefined,
        category: category,
      })
      setStep('done')
    } catch (err) {
      setError(err.response?.data?.detail || '发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  const handleKeepPrivate = () => {
    setShowShareModal(false)
  }

  const handleClose = () => {
    setShowShareModal(false)
  }

  // 步骤1：存入成功
  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.45)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false) }}>
        <div className="w-full max-w-md rounded-xl p-6 animate-up" style={{
          backgroundColor: 'var(--color-surface-card)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <div className="text-center mb-5">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-50)' }}>
                <IconArchive className="icon-lg" style={{ color: 'var(--color-brand-500)' }} />
              </div>
            </div>
            <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--color-text-primary)' }}>已存入你的档案</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>要不要把这个对话分享到广场？</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('form')}
              className="btn-primary flex-1 text-sm"
            >
              <IconShare2 className="icon" />
              发布到广场
            </button>
            <button
              onClick={handleKeepPrivate}
              className="btn-secondary flex-1 text-sm"
            >
              <IconLock className="icon" />
              仅自己可见
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤2：编辑发布信息
  if (step === 'form') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.45)' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false) }}>
        <div className="w-full max-w-md rounded-xl p-6 animate-up" style={{
          backgroundColor: 'var(--color-surface-card)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-display font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <IconShare2 className="icon-lg mr-1" style={{ color: 'var(--color-brand-500)' }} />
              发布到广场
            </h2>
            <button onClick={() => setShowShareModal(false)} className="btn-ghost p-1">
              <IconX className="icon" />
            </button>
          </div>

          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 outline-none text-sm transition-all duration-150 rounded-lg"
                style={{
                  border: '1px solid var(--color-surface-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-body)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
                placeholder="AI 会自动生成标题，你也可以手动修改"
                maxLength={255}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>摘要</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3 py-2 outline-none text-sm transition-all duration-150 rounded-lg resize-none"
                style={{
                  border: '1px solid var(--color-surface-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-body)',
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
                rows={3}
                placeholder="AI 会自动生成摘要，你也可以手动修改"
                maxLength={500}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>分类</label>
              <div className="flex flex-wrap gap-2">
                {['技术', '科学', '生活', '学习', '创意', '其他'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                    style={{
                      backgroundColor: category === cat ? 'var(--color-brand-500)' : 'transparent',
                      color: category === cat ? 'white' : 'var(--color-text-muted)',
                      border: `1px solid ${category === cat ? 'var(--color-brand-500)' : 'var(--color-surface-border)'}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <div className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: 'oklch(0.58 0.18 30 / 0.1)', color: 'var(--color-danger, oklch(0.58 0.18 30))' }}>
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="btn-primary flex-1 text-sm"
            >
              {publishing ? <IconLoader className="icon" /> : <IconCheck className="icon" />}
              {publishing ? '发布中...' : '确认发布'}
            </button>
            <button
              onClick={() => setStep('success')}
              disabled={publishing}
              className="btn-secondary flex-1 text-sm"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 步骤3：发布成功
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'oklch(0 0 0 / 0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowShareModal(false) }}>
      <div className="w-full max-w-md rounded-xl p-6 animate-up text-center" style={{
        backgroundColor: 'var(--color-surface-card)',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(0.62 0.15 145 / 0.15)' }}>
            <IconCheck className="icon-lg" style={{ color: 'var(--color-success, oklch(0.62 0.15 145))' }} />
          </div>
        </div>
        <h2 className="text-lg font-display font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>发布成功</h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>你的内容已发布到广场，快去看看吧</p>
        <button onClick={handleClose} className="btn-primary w-full text-sm">
          知道了
        </button>
      </div>
    </div>
  )
}
