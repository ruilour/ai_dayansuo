import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import PostCard from '../components/PostCard'
import { IconUser, IconHeart, IconMessageCircle, IconFlask, IconMessageSquare } from '../components/Icons'

export default function UserProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('posts') // posts | bookmarks
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchUser() }, [id])
  useEffect(() => {
    if (tab === 'posts') fetchPosts()
    else fetchBookmarks()
  }, [id, tab])

  const fetchUser = async () => {
    try {
      const [userRes, statsRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/stats`),
      ])
      setUser(userRes.data)
      setStats(statsRes.data)
    } catch { navigate('/') }
  }

  const fetchPosts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/users/${id}/posts?page=1&page_size=20`)
      setPosts(data.items || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const fetchBookmarks = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/bookmarks?page=1&page_size=20')
      setPosts(data.items || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  if (!user) return null

  return (
    <div className="page-container py-8">
      <div className="flex items-center gap-4 mb-6 animate-in">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
          style={{ backgroundColor: 'var(--color-brand-900)', color: 'var(--color-brand-300)' }}>
          {user.username?.[0] || '?'}
        </div>
        <div>
          <h1 className="heading-page">{user.username}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-placeholder)' }}>
            加入于 {new Date(user.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>

      {stats && (
        <div className="flex gap-6 mb-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span className="inline-flex items-center gap-1">
            <IconMessageSquare className="icon" /> 帖子 {stats.posts_count}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconHeart className="icon" /> 获赞 {stats.total_likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <IconMessageCircle className="icon" /> 评论 {stats.comments_count}
          </span>
        </div>
      )}

      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ backgroundColor: 'var(--color-surface-card)' }}>
        <button onClick={() => setTab('posts')}
          className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: tab === 'posts' ? 'var(--color-brand-500)' : 'transparent',
            color: tab === 'posts' ? 'white' : 'var(--color-text-muted)',
          }}>
          发布的帖子
        </button>
        <button onClick={() => setTab('bookmarks')}
          className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
          style={{
            backgroundColor: tab === 'bookmarks' ? 'var(--color-brand-500)' : 'transparent',
            color: tab === 'bookmarks' ? 'white' : 'var(--color-text-muted)',
          }}>
          收藏的帖子
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>加载中...</div>
      ) : posts.length === 0 ? (
        <div className="empty-state animate-in">
          <IconFlask className="icon" style={{ width: 48, height: 48, color: 'var(--color-surface-disabled)' }} />
          <p className="empty-state-title">{tab === 'posts' ? '还没有发布帖子' : '还没有收藏帖子'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 items-stretch">
          {posts.map((post) => (
            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="cursor-pointer animate-up flex">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
