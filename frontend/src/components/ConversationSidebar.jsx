import { useState, useEffect, useRef } from 'react'
import api from '../api'
import { useStore } from '../store/useStore'
import { IconPlus, IconChevronRight, IconTrash2, IconCheck, IconX } from './Icons'

export default function ConversationSidebar() {
  const savedConversations = useStore((s) => s.savedConversations)
  const setSavedConversations = useStore((s) => s.setSavedConversations)
  const selectedSavedId = useStore((s) => s.selectedSavedId)
  const setSelectedSavedId = useStore((s) => s.setSelectedSavedId)
  const setCurrentConversation = useStore((s) => s.setCurrentConversation)
  const sidebarRefreshKey = useStore((s) => s.sidebarRefreshKey)

  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleting, setDeleting] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    api.get('/conversations').then(({ data }) => setSavedConversations(data)).catch((e) => console.error('获取对话列表失败:', e))
  }, [sidebarRefreshKey])

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

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
    } catch (e) { console.error('侧边栏操作失败:', e) }
  }

  const handleNewChat = () => {
    setSelectedSavedId(null)
    useStore.getState().clearConversation()
  }

  const startRename = (conv) => {
    setEditingId(conv.id)
    setEditTitle(conv.title)
  }

  const confirmRename = async () => {
    if (!editingId || !editTitle.trim()) {
      setEditingId(null)
      return
    }
    try {
      await api.patch(`/conversations/${editingId}`, { title: editTitle.trim() })
      setSavedConversations(
        savedConversations.map((c) =>
          c.id === editingId ? { ...c, title: editTitle.trim() } : c
        )
      )
    } catch (e) { console.error('侧边栏操作失败:', e) }
    setEditingId(null)
  }

  const cancelRename = () => {
    setEditingId(null)
  }

  const handleDelete = async (conv) => {
    if (deleting === conv.id) return

    let msg = '确定删除这个对话？删除后不可恢复。'
    if (conv.has_post) {
      msg = '⚠️ 该对话已发布到广场，删除对话不会影响广场中的帖子。\n要去除广场帖子请到「我的主页」操作。\n\n确定删除这个对话？'
    }
    if (!confirm(msg)) return

    setDeleting(conv.id)
    try {
      await api.delete(`/conversations/${conv.id}`)
      setSavedConversations(savedConversations.filter((c) => c.id !== conv.id))
      if (selectedSavedId === conv.id) {
        useStore.getState().clearConversation()
      }
    } catch (e) { console.error('侧边栏操作失败:', e) }
    setDeleting(null)
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
            <div
              key={conv.id}
              className="group relative w-full rounded-lg text-sm transition-all duration-150"
              style={{
                backgroundColor: selectedSavedId === conv.id ? 'var(--color-brand-50)' : 'transparent',
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
              {editingId === conv.id ? (
                /* 编辑模式 */
                <div className="flex items-center gap-1 px-2 py-2">
                  <input
                    ref={inputRef}
                    className="flex-1 min-w-0 px-2 py-1 rounded text-sm outline-none"
                    style={{
                      backgroundColor: 'var(--color-surface-card)',
                      border: '1px solid var(--color-brand-300)',
                      color: 'var(--color-text-body)',
                    }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename()
                      if (e.key === 'Escape') cancelRename()
                    }}
                  />
                  <button onClick={confirmRename} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-brand-600)' }}>
                    <IconCheck className="icon" />
                  </button>
                  <button onClick={cancelRename} className="p-1 rounded hover:opacity-70" style={{ color: 'var(--color-text-muted)' }}>
                    <IconX className="icon" />
                  </button>
                </div>
              ) : (
                /* 普通模式 */
                <button
                  onClick={() => handleSelect(conv)}
                  className="w-full text-left px-3 py-2.5 flex items-center justify-between gap-2"
                  style={{
                    color: selectedSavedId === conv.id ? 'var(--color-brand-700)' : 'var(--color-text-body)',
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
              )}

              {/* 操作按钮：hover 显示 */}
              {editingId !== conv.id && (
                <div
                  className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5"
                  style={{
                    backgroundColor: selectedSavedId === conv.id ? 'var(--color-brand-50)' : 'var(--color-surface-card)',
                    borderRadius: '6px',
                    padding: '1px',
                  }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                    className="p-1 rounded hover:opacity-70 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                    title="重命名"
                  >
                    改
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(conv) }}
                    disabled={deleting === conv.id}
                    className="p-1 rounded hover:opacity-70"
                    style={{ color: '#ef4444' }}
                    title="删除"
                  >
                    <IconTrash2 className="icon" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
