import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import PostCard from '../components/PostCard'
import { IconGlobe, IconMessageSquare, IconFlask, IconSearch, IconX } from '../components/Icons'

export default function Home() {
  const [posts, setPosts] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const loaderRef = useRef(null)
  const fetchingRef = useRef(false)
  const navigate = useNavigate()

  // 分类过滤
  const [activeCategory, setActiveCategory] = useState(null)
  const categoryRef = useRef(null)
  const prevCategoryRef = useRef(null)

  // 搜索状态
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = 未搜索, [] = 搜了但无结果
  const [searching, setSearching] = useState(false)
  const searchInputRef = useRef(null)

  const fetchPosts = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return
    fetchingRef.current = true
    setLoading(true)
    try {
      const { data } = await api.get(`/posts?page=${page}&page_size=10${categoryRef.current ? `&category=${categoryRef.current}` : ''}`)
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const newItems = data.items.filter((item) => !existingIds.has(item.id))
        return [...prev, ...newItems]
      })
      setHasMore(data.has_more)
      setPage((p) => p + 1)
    } catch {
      // ignore
    } finally {
      setLoading(false)
      setInitialLoading(false)
      fetchingRef.current = false
    }
  }, [page, hasMore])

  useEffect(() => {
    fetchPosts()
  }, [])

  // 分类切换时重置列表
  useEffect(() => {
    if (prevCategoryRef.current === activeCategory) return
    prevCategoryRef.current = activeCategory
    categoryRef.current = activeCategory

    if (fetchingRef.current) return
    setPosts([])
    setPage(1)
    setHasMore(true)

    const fetchFirstPage = async () => {
      fetchingRef.current = true
      setLoading(true)
      try {
        const url = `/posts?page=1&page_size=10${activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : ''}`
        const { data } = await api.get(url)
        setPosts(data.items || [])
        setHasMore(data.has_more)
        setPage(2)
      } catch {
        // ignore
      } finally {
        setLoading(false)
        setInitialLoading(false)
        fetchingRef.current = false
      }
    }
    fetchFirstPage()
  }, [activeCategory])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingRef.current && !searchResults) {
          fetchPosts()
        }
      },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchPosts, hasMore, searchResults])

  // 搜索
  const handleSearch = async (e) => {
    e?.preventDefault()
    const q = keyword.trim()
    if (!q) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&page=1&page_size=20`)
      setSearchResults(data.items || [])
    } catch {
      // ignore
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setKeyword('')
    setSearchResults(null)
    searchInputRef.current?.focus()
  }

  // 搜索快捷键
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && searchResults !== null) {
        handleClearSearch()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchResults])

  const displayingPosts = searchResults !== null ? searchResults : posts
  const isSearchMode = searchResults !== null

  return (
    <div className="page-container py-8">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="heading-page inline-flex items-center gap-2">
          <IconGlobe className="icon-lg" style={{ color: 'var(--color-brand-500)' }} />
          广场
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          浏览大家分享的 AI 问答，参与讨论和验证
        </p>
      </div>

      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="mb-6">
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-150"
          style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-surface-border)' }}
          onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-brand-500)'}
          onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-surface-border)'}
        >
          <IconSearch className="icon" style={{ color: 'var(--color-text-placeholder)', flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索帖子标题或摘要..."
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--color-text-body)' }}
          />
          {keyword && (
            <button type="button" onClick={handleClearSearch} className="p-0.5">
              <IconX className="icon" style={{ color: 'var(--color-text-placeholder)' }} />
            </button>
          )}
        </div>
      </form>

      {/* 搜索结果提示 */}
      {isSearchMode && (
        <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span>
            搜索 &ldquo;{keyword}&rdquo; 共 {searchResults.length} 条结果
          </span>
          <button onClick={handleClearSearch} className="btn-ghost text-xs ml-auto">
            清除搜索
          </button>
        </div>
      )}

      {/* 分类过滤栏 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={{
            backgroundColor: !activeCategory ? 'var(--color-brand-500)' : 'var(--color-surface-card)',
            color: !activeCategory ? 'white' : 'var(--color-text-muted)',
            border: `1px solid ${!activeCategory ? 'var(--color-brand-500)' : 'var(--color-surface-border)'}`,
          }}
        >
          全部
        </button>
        {['技术', '科学', '生活', '学习', '创意', '其他'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: activeCategory === cat ? 'var(--color-brand-500)' : 'var(--color-surface-card)',
              color: activeCategory === cat ? 'white' : 'var(--color-text-muted)',
              border: `1px solid ${activeCategory === cat ? 'var(--color-brand-500)' : 'var(--color-surface-border)'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 空状态 */}
      {displayingPosts.length === 0 && !initialLoading && !searching ? (
        <div className="empty-state animate-in">
          <IconFlask className="icon" style={{ width: 48, height: 48, color: 'var(--color-surface-disabled)' }} />
          <p className="empty-state-title">
            {isSearchMode ? '没有找到相关帖子' : '还没有人分享内容'}
          </p>
          <p className="empty-state-desc">
            {isSearchMode ? '试试其他关键词' : '去提问并分享你的第一个 AI 回答吧！'}
          </p>
          {!isSearchMode && (
            <button onClick={() => navigate('/chat')} className="btn-primary mt-6">
              <IconMessageSquare className="icon" />
              去提问
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 items-stretch">
          {displayingPosts.map((post) => (
            <div key={post.id} onClick={() => navigate(`/post/${post.id}`)} className="cursor-pointer animate-up flex">
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}

      {/* 搜索中 */}
      {searching && (
        <div className="py-6 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>
          搜索中...
        </div>
      )}

      {/* 加载中 */}
      {loading && !isSearchMode && (
        <div className="py-6 text-center text-sm" style={{ color: 'var(--color-text-placeholder)' }}>
          加载中...
        </div>
      )}

      {/* 无限滚动触发器（仅非搜索模式） */}
      {hasMore && !loading && !isSearchMode && (
        <div ref={loaderRef} className="h-4" />
      )}
    </div>
  )
}
