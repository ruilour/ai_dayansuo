import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import PostCard from '../components/PostCard'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef(null)
  const navigate = useNavigate()

  const fetchPosts = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const { data } = await api.get(`/posts?page=${page}&page_size=10`)
      setPosts((prev) => [...prev, ...data.items])
      setHasMore(data.has_more)
      setPage((p) => p + 1)
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, hasMore, loading])

  useEffect(() => {
    fetchPosts()
  }, [])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchPosts()
        }
      },
      { threshold: 0.1 },
    )
    if (loaderRef.current) observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [fetchPosts, hasMore, loading])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">🏛️ 广场</h1>
        <p className="text-sm text-gray-500 mt-1">浏览大家分享的 AI 问答，参与讨论和验证</p>
      </div>

      {posts.length === 0 && !loading ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🧪</div>
          <p className="text-lg text-gray-500">还没有人分享内容</p>
          <p className="text-sm text-gray-400 mt-2">去提问并分享你的第一个 AI 回答吧！</p>
          <button
            onClick={() => navigate('/chat')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 去提问
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="cursor-pointer">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div ref={loaderRef} className="py-4 text-center text-sm text-gray-400">
          {loading ? '加载中...' : ''}
        </div>
      )}
    </div>
  )
}
