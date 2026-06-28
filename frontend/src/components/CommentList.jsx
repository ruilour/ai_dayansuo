import { useState, useEffect } from 'react'
import api from '../api'
import { useStore } from '../store/useStore'
import { IconMessageCircle, IconUser, IconReply, IconTrash2, IconX, IconSendHorizonal, IconLoader } from './Icons'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return d.toLocaleDateString('zh-CN')
}

export default function CommentList({ postId, onCommentChange }) {
  const user = useStore((s) => s.user)
  const [comments, setComments] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState(null) // { id, username }
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [reportingId, setReportingId] = useState(null)

  // 加载评论
  useEffect(() => {
    fetchComments()
  }, [])

  const fetchComments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/posts/${postId}/comments`)
      setComments(data.comments || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error('获取评论失败:', e)
    } finally {
      setLoading(false)
    }
  }

  // 发表一级评论
  const handleSubmitComment = async () => {
    if (!user) return
    if (!newComment.trim()) return
    setSending(true)
    try {
      const { data } = await api.post(`/posts/${postId}/comments`, {
        content: newComment.trim(),
      })
      setComments((prev) => [...prev, { ...data, replies: [] }])
      setTotal((n) => n + 1)
      setNewComment('')
      onCommentChange?.()
    } catch (err) {
      alert(err.response?.data?.detail || '评论失败')
    } finally {
      setSending(false)
    }
  }

  // 回复评论
  const handleReply = async (parentId) => {
    if (!user) return
    if (!replyText.trim()) return
    setSendingReply(true)
    try {
      const { data } = await api.post(`/comments/${parentId}/replies`, {
        content: replyText.trim(),
      })
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, data] }
            : c
        )
      )
      setTotal((n) => n + 1)
      setReplyTo(null)
      setReplyText('')
      onCommentChange?.()
    } catch (err) {
      alert(err.response?.data?.detail || '回复失败')
    } finally {
      setSendingReply(false)
    }
  }

  // 删除评论
  const handleDelete = async (commentId) => {
    if (!confirm('确定删除这条评论？')) return
    setDeletingId(commentId)
    try {
      await api.delete(`/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setTotal((n) => Math.max(0, n - 1))
      onCommentChange?.()
    } catch {
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  // 举报
  const handleReport = async (targetType, targetId) => {
    const reason = prompt('举报原因：\n1. 广告 (spam)\n2. 辱骂 (abuse)\n3. 色情 (porn)\n4. 其他 (other)\n\n请输入选项数字或直接输入原因代码：')
    if (!reason) return
    const reasonMap = { '1': 'spam', '2': 'abuse', '3': 'porn', '4': 'other' }
    const reasonCode = reasonMap[reason] || reason
    if (!['spam', 'abuse', 'porn', 'other'].includes(reasonCode)) {
      alert('无效的举报原因')
      return
    }
    setReportingId(targetId)
    try {
      await api.post('/reports', { target_type: targetType, target_id: targetId, reason: reasonCode })
      alert('举报已提交')
    } catch (err) {
      alert(err.response?.data?.detail || '举报失败')
    } finally {
      setReportingId(null)
    }
  }

  // 删除二级回复
  const handleDeleteReply = async (parentId, replyId) => {
    if (!confirm('确定删除这条回复？')) return
    setDeletingId(replyId)
    try {
      await api.delete(`/comments/${replyId}`)
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) }
            : c
        )
      )
      setTotal((n) => Math.max(0, n - 1))
      onCommentChange?.()
    } catch {
      alert('删除失败')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="mt-8 animate-in">
      {/* 评论标题 */}
      <div className="flex items-center gap-2 mb-5">
        <IconMessageCircle className="icon-lg" style={{ color: 'var(--color-brand-400)' }} />
        <h3 className="font-display font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          评论
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}>
          {total}
        </span>
      </div>

      {/* 输入新评论 */}
      {user ? (
        <div className="mb-6" style={{ backgroundColor: 'var(--color-surface-card)', borderRadius: '0.75rem', border: '1px solid var(--color-surface-border)' }}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="写下你的评论..."
            className="w-full px-4 pt-3 pb-2 text-sm outline-none resize-none rounded-t-xl"
            style={{ backgroundColor: 'transparent', color: 'var(--color-text-body)', minHeight: '3rem' }}
            rows={2}
          />
          <div className="flex justify-end px-3 pb-3">
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || sending}
              className="btn-primary text-xs"
            >
              {sending ? <IconLoader className="icon" /> : null}
              {sending ? '发表中...' : '发表评论'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-6 py-4 text-center text-sm rounded-xl" style={{ backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-muted)' }}>
          <a href="/login" style={{ color: 'var(--color-brand-400)' }} className="hover:underline">登录</a> 后即可评论
        </div>
      )}

      {/* 加载中 */}
      {loading && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>
          加载评论...
        </div>
      )}

      {/* 空状态 */}
      {!loading && comments.length === 0 && (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>
          暂无评论，来发表第一条吧
        </div>
      )}

      {/* 评论列表 */}
      {!loading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              user={user}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyText={replyText}
              setReplyText={setReplyText}
              sendingReply={sendingReply}
              deletingId={deletingId}
              reportingId={reportingId}
              onReply={handleReply}
              onDelete={handleDelete}
              onDeleteReply={handleDeleteReply}
              onReport={handleReport}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 单条评论（递归渲染二级回复）
function CommentItem({
  comment,
  user,
  replyTo,
  setReplyTo,
  replyText,
  setReplyText,
  sendingReply,
  deletingId,
  reportingId,
  onReply,
  onDelete,
  onDeleteReply,
  onReport,
}) {
  const isReplying = replyTo?.id === comment.id

  return (
    <div className="animate-up">
      <div className="flex gap-3">
        {/* 头像 */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium"
          style={{ backgroundColor: 'var(--color-brand-900)', color: 'var(--color-brand-300)' }}
        >
          {comment.username?.[0] || '?'}
        </div>

        <div className="flex-1 min-w-0">
          {/* 头部 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--color-brand-300)' }}>
              {comment.username}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-placeholder)' }}>
              {formatTime(comment.created_at)}
            </span>
          </div>

          {/* 内容 */}
          <p className="text-sm mb-2" style={{ color: 'var(--color-text-body)' }}>
            {comment.content}
          </p>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mb-2">
            {user && (
              <button
                onClick={() => setReplyTo(isReplying ? null : { id: comment.id, username: comment.username })}
                className="inline-flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--color-text-placeholder)' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-brand-400)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
              >
                <IconReply className="icon" />
                回复
              </button>
            )}
            {user && user.id === comment.user_id && (
              <button
                onClick={() => onDelete(comment.id)}
                disabled={deletingId === comment.id}
                className="inline-flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--color-text-placeholder)' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-danger, oklch(0.65 0.18 30))'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
              >
                <IconTrash2 className="icon" />
                删除
              </button>
            )}
            {user && (
              <button
                onClick={() => onReport('comment', comment.id)}
                disabled={reportingId === comment.id}
                className="inline-flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--color-text-placeholder)' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--color-danger, oklch(0.65 0.18 30))'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
              >
                举报
              </button>
            )}
          </div>

          {/* 回复输入框 */}
          {isReplying && (
            <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-surface-border)' }}>
              <div className="flex items-center gap-2 mb-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <IconReply className="icon" />
                回复 @{replyTo.username}
                <button onClick={() => { setReplyTo(null); setReplyText('') }} className="ml-auto">
                  <IconX className="icon" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="写下你的回复..."
                  className="flex-1 px-3 py-1.5 text-sm outline-none rounded-lg"
                  style={{ backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-body)', border: '1px solid var(--color-surface-border)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      onReply(comment.id)
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={() => onReply(comment.id)}
                  disabled={!replyText.trim() || sendingReply}
                  className="btn-primary text-xs px-3"
                >
                  {sendingReply ? <IconLoader className="icon" /> : <IconSendHorizonal className="icon" />}
                </button>
              </div>
            </div>
          )}

          {/* 二级回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 space-y-3 pl-2" style={{ borderLeft: '2px solid var(--color-surface-border)' }}>
              {comment.replies.map((reply) => (
                <div key={reply.id} className="flex gap-2 py-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-brand-900)', color: 'var(--color-brand-300)' }}
                  >
                    {reply.username?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium" style={{ color: 'var(--color-brand-300)' }}>
                        {reply.username}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--color-text-placeholder)' }}>
                        {formatTime(reply.created_at)}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
                      {reply.content}
                    </p>
                    {user && user.id === reply.user_id && (
                      <button
                        onClick={() => onDeleteReply(comment.id, reply.id)}
                        disabled={deletingId === reply.id}
                        className="inline-flex items-center gap-1 text-xs mt-1 transition-colors"
                        style={{ color: 'var(--color-text-placeholder)' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--color-danger, oklch(0.65 0.18 30))'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
                      >
                        <IconTrash2 className="icon" />
                        删除
                      </button>
                    )}
                    {user && (
                      <button
                        onClick={() => onReport('comment', reply.id)}
                        disabled={reportingId === reply.id}
                        className="inline-flex items-center gap-1 text-xs mt-1 transition-colors"
                        style={{ color: 'var(--color-text-placeholder)' }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--color-danger, oklch(0.65 0.18 30))'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
                      >
                        举报
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
