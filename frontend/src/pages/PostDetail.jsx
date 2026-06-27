import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import api from '../api'
import { useStore } from '../store/useStore'
import { IconHeart, IconHeartFilled, IconBookmark, IconBookmarkFilled, IconMessageCircle, IconUser, IconChevronLeft, IconChevronDown, IconChevronRight, IconFlask } from '../components/Icons'
import CommentList from '../components/CommentList'

function ReasoningBlock({ content }) {
  const [expanded, setExpanded] = useState(false)
  if (!content) return null
  return (
    <div className="mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 text-xs transition-colors mb-1"
        style={{ color: 'var(--color-text-placeholder)' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-placeholder)'}
      >
        {expanded ? <IconChevronDown className="icon" /> : <IconChevronRight className="icon" />}
        查看 AI 的思考过程
      </button>
      {expanded && (
        <div
          className="text-sm italic rounded-lg p-3 whitespace-pre-wrap"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface-card)',
          }}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export default function PostDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useStore((s) => s.user)

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [liking, setLiking] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [feedback, setFeedback] = useState('') // toast 反馈

  useEffect(() => {
    fetchPost()
  }, [id])

  const fetchPost = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get(`/posts/${id}`)
      setPost(data)
    } catch (err) {
      setError(err.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (liking) return
    setLiking(true)
    try {
      const { data } = await api.post(`/posts/${id}/like`)
      const wasLiked = post?.is_liked
      setPost((prev) => ({
        ...prev,
        is_liked: data.liked,
        likes_count: data.likes_count,
      }))
      showFeedback(data.liked ? '已点赞' : '已取消点赞')
    } catch {
      // ignore
    } finally {
      setLiking(false)
    }
  }

  const handleBookmark = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (bookmarking) return
    setBookmarking(true)
    try {
      const { data } = await api.post(`/posts/${id}/bookmark`)
      setPost((prev) => ({
        ...prev,
        is_bookmarked: data.bookmarked,
        bookmarks_count: data.bookmarks_count,
      }))
      showFeedback(data.bookmarked ? '已收藏' : '已取消收藏')
    } catch {
      // ignore
    } finally {
      setBookmarking(false)
    }
  }

  const handleReport = async (targetType, targetId) => {
    if (!user) {
      navigate('/login')
      return
    }
    const reason = prompt('举报原因：\n1. 广告 (spam)\n2. 辱骂 (abuse)\n3. 色情 (porn)\n4. 其他 (other)\n\n请输入选项数字或直接输入原因代码：')
    if (!reason) return
    const reasonMap = { '1': 'spam', '2': 'abuse', '3': 'porn', '4': 'other' }
    const reasonCode = reasonMap[reason] || reason
    if (!['spam', 'abuse', 'porn', 'other'].includes(reasonCode)) {
      alert('无效的举报原因')
      return
    }
    setReporting(true)
    try {
      await api.post('/reports', { target_type: targetType, target_id: targetId, reason: reasonCode })
      showFeedback('举报已提交')
    } catch (err) {
      alert(err.response?.data?.detail || '举报失败')
    } finally {
      setReporting(false)
    }
  }

  const showFeedback = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 2000)
  }

  // 加载中
  if (loading) {
    return (
      <div className="page-container py-12">
        <div className="animate-pulse max-w-3xl mx-auto space-y-4">
          <div className="h-6 rounded w-3/4 mx-auto" style={{ backgroundColor: 'var(--color-surface-disabled)' }}></div>
          <div className="h-4 rounded w-1/2 mx-auto" style={{ backgroundColor: 'var(--color-surface-disabled)' }}></div>
          <div className="h-32 rounded mt-6" style={{ backgroundColor: 'var(--color-surface-card)' }}></div>
        </div>
      </div>
    )
  }

  // 错误
  if (error) {
    return (
      <div className="page-container py-12">
        <div className="empty-state animate-in">
          <IconFlask className="icon" style={{ width: 48, height: 48, color: 'var(--color-surface-disabled)' }} />
          <p className="empty-state-title">{error}</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            <IconChevronLeft className="icon" />
            回到广场
          </button>
        </div>
      </div>
    )
  }

  // 空数据
  if (!post) {
    return (
      <div className="page-container py-12">
        <div className="empty-state animate-in">
          <IconFlask className="icon" style={{ width: 48, height: 48, color: 'var(--color-surface-disabled)' }} />
          <p className="empty-state-title">帖子不存在</p>
          <button onClick={() => navigate('/')} className="btn-primary mt-4">
            <IconChevronLeft className="icon" />
            回到广场
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container py-6" style={{ maxWidth: '48rem' }}>
      {/* 面包屑 */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-1 text-sm transition-colors mb-5 btn-ghost"
      >
        <IconChevronLeft className="icon" />
        返回广场
      </button>

      {/* 标题区域 */}
      <div className="mb-6 animate-in">
        <h1 className="heading-page mb-2">{post.title}</h1>
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{post.summary}</p>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-placeholder)' }}>
          <span className="inline-flex items-center gap-1">
            <IconUser className="icon" />
            {post.username || '用户'}
          </span>
          <span>
            {post.created_at ? new Date(post.created_at).toLocaleString('zh-CN') : ''}
          </span>
        </div>
      </div>

      {/* 思考过程 */}
      {post.reasoning_content && (
        <ReasoningBlock content={post.reasoning_content} />
      )}

      {/* 对话内容 */}
      <div className="card p-6 mb-6 animate-up">
        <div className="prose prose-sm max-w-none" style={{ color: 'var(--color-text-body)' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
          >
            {post.full_content}
          </ReactMarkdown>
        </div>
      </div>

      {/* 点赞栏 */}
      <div className="flex items-center gap-4 py-4 relative" style={{ borderTop: '1px solid var(--color-surface-border)' }}>
        <button
          onClick={handleLike}
          disabled={liking}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            post.is_liked
              ? ''
              : ''
          }`}
          style={{
            backgroundColor: post.is_liked ? 'var(--color-brand-50)' : 'var(--color-surface-card)',
            color: post.is_liked ? 'var(--color-brand-600)' : 'var(--color-text-muted)',
            border: `1px solid ${post.is_liked ? 'var(--color-brand-200)' : 'var(--color-surface-border)'}`,
          }}
        >
          {post.is_liked ? <IconHeartFilled className="icon" /> : <IconHeart className="icon" />}
          {post.is_liked ? '已赞' : '点赞'}
          <span className="text-xs opacity-70">({post.likes_count})</span>
        </button>
        <button
          onClick={handleBookmark}
          disabled={bookmarking}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: post.is_bookmarked ? 'var(--color-brand-50)' : 'var(--color-surface-card)',
            color: post.is_bookmarked ? 'var(--color-brand-600)' : 'var(--color-text-muted)',
            border: `1px solid ${post.is_bookmarked ? 'var(--color-brand-200)' : 'var(--color-surface-border)'}`,
          }}
        >
          {post.is_bookmarked ? <IconBookmarkFilled className="icon" /> : <IconBookmark className="icon" />}
          {post.is_bookmarked ? '已收藏' : '收藏'}
        </button>
        <span className="inline-flex items-center gap-1 text-sm" style={{ color: 'var(--color-text-placeholder)' }}>
          <IconMessageCircle className="icon" />
          {post.comments_count} 条评论
        </span>
        {user && (
          <button
            onClick={() => handleReport('post', post.id)}
            disabled={reporting}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all duration-150 ml-auto"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-surface-border)' }}
          >
            举报
          </button>
        )}
      </div>

      {/* 操作反馈 toast */}
      {feedback && (
        <div className="text-sm text-center py-2 mb-4 rounded-lg animate-in transition-all"
          style={{ backgroundColor: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}>
          {feedback}
        </div>
      )}

      {/* 评论区 */}
      <CommentList
        postId={post.id}
        onCommentChange={() => {
          // 刷新评论计数
          api.get(`/posts/${post.id}`).then(({ data }) => {
            setPost((prev) => ({ ...prev, comments_count: data.comments_count }))
          }).catch(() => {})
        }}
      />
    </div>
  )
}
