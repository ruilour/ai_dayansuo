import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { IconBell, IconX, IconCheck, IconMessageCircle, IconHeart, IconReply, IconBookmark } from './Icons'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return d.toLocaleDateString('zh-CN')
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef(null)

  // Fetch unread count
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count')
      setUnreadCount(data.count)
    } catch { /* ignore */ }
  }, [])

  // Poll every 15s
  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 15000)
    return () => clearInterval(interval)
  }, [fetchCount])

  // Refetch on tab visibility change and window focus
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchCount() }
    const onFocus = () => fetchCount()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchCount])

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = async () => {
    if (!open) {
      try {
        const { data } = await api.get('/notifications?page=1&page_size=10')
        setNotifications(data.items || [])
      } catch { /* ignore */ }
    }
    setOpen(!open)
  }

  const handleReadAll = async () => {
    try {
      await api.post('/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  const handleClick = (n) => {
    setOpen(false)
    if (n.post_id) navigate(`/post/${n.post_id}`)
  }

  const iconMap = {
    comment: IconMessageCircle,
    reply: IconReply,
    like: IconHeart,
    bookmark: IconBookmark,
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="btn-ghost p-1.5 relative">
        <IconBell className="icon" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: 'oklch(0.65 0.18 30)', fontSize: '9px', lineHeight: 1 }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-xl shadow-modal animate-in z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--color-surface-elevated)', border: '1px solid var(--color-surface-border)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>通知</span>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-brand-400)' }}>
                <IconCheck className="icon" /> 全部已读
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>暂无通知</div>
            ) : (
              notifications.map((n) => {
                const IconComp = iconMap[n.type] || IconBell
                return (
                  <button key={n.id} onClick={() => handleClick(n)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 transition-colors text-sm"
                    style={{
                      backgroundColor: n.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.08)',
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-card)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'rgba(139, 92, 246, 0.08)'}>
                    <IconComp className="icon mt-0.5" style={{ color: 'var(--color-brand-400)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
                        <span style={{ color: 'var(--color-brand-300)' }}>{n.actor_username}</span>
                        {n.type === 'comment' && ' 评论了你的帖子'}
                        {n.type === 'reply' && ' 回复了你的评论'}
                        {n.type === 'like' && ' 赞了你的帖子'}
                        {n.type === 'bookmark' && ' 收藏了你的帖子'}
                        {n.type === 'system_mute' && ' 你已被管理员禁言'}
                        {n.type === 'system_ban' && ' 你已被管理员封号'}
                      </p>
                      {n.post_title && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-placeholder)' }}>「{n.post_title}」</p>
                      )}
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-placeholder)' }}>{formatTime(n.created_at)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
