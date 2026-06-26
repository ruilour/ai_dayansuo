# 扩展功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 四个扩展功能：帖子分类、帖子收藏、个人主页、通知系统

**Architecture:** 后端 FastAPI + MySQL，前端 React + Vite + Tailwind。每个功能独立增量开发，按依赖顺序实施。

**Tech Stack:** FastAPI, SQLAlchemy, React 19, Zustand, Axios

## Global Constraints

- 所有颜色使用 CSS 变量（`var(--color-*)`），无硬编码 hex
- 所有 UI 图标使用 `Icons.jsx` 中的 SVG 组件，不引入新依赖
- 所有 OKLCH 颜色值保持一致
- 遵循现有文件名/路由命名约定

---

## 文件结构

```
backend/app/
  models/
    post.py              # + category 字段
    bookmark.py          [新建] PostBookmark 模型
    notification.py      [新建] Notification 模型
    __init__.py          # 注册新模型
  routes/
    categories.py        [新建] 分类列表 API
    bookmarks.py         [新建] 收藏/取消 + 收藏列表
    users.py             [新建] 用户信息/帖子/统计
    notifications.py     [新建] 通知列表/已读/未读数
    posts.py             # + category 过滤 + is_bookmarked
    comments.py          # + 通知创建 hooks
  main.py                # 注册新路由
  schemas/               # 使用已有 PostItem 扩展

frontend/src/
  components/
    PostCard.jsx         # + category badge + bookmark icon
    Navbar.jsx           # + 用户链接到主页 + 通知铃铛
    NotificationBell.jsx [新建] 铃铛图标 + 下拉通知列表
  pages/
    Home.jsx             # + category filter bar
    UserProfile.jsx      [新建] 个人主页
    PostDetail.jsx       # + bookmark button
  App.jsx                # + /user/:id 路由
```

---

### Task 1: 帖子分类 — 后端

**Files:**
- Modify: `backend/app/models/post.py` — 添加 `category` 字段
- Create: `backend/app/routes/categories.py` — 分类列表 API
- Modify: `backend/app/routes/posts.py` — 接收 `category` 参数、支持 `?category=` 过滤、返回 `category` 字段
- Modify: `backend/app/main.py` — 注册分类路由

**Interfaces:**
- Produces: `GET /api/categories` → `{"categories": [{"name": "技术", "count": 5}, ...]}`
- Produces: `POST /api/posts` 接受 `category: str` 字段
- Produces: `GET /api/posts?category=技术` 过滤
- Produces: `PostItem` / `PostDetail` 增加 `category` 字段

- [ ] **Step 1: Post 模型添加 category 字段**

```python
# backend/app/models/post.py — 在 class Post 中添加
category = Column(String(20), default="其他", nullable=False)
```

- [ ] **Step 2: 创建 categories.py 路由**

```python
# backend/app/routes/categories.py
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.post import Post

router = APIRouter(tags=["分类"])

CATEGORIES = ["技术", "科学", "生活", "学习", "创意", "其他"]

@router.get("/api/categories")
def list_categories(db: Session = Depends(get_db)):
    """返回所有分类及其帖子数量"""
    all_posts = db.query(Post.category).all()
    counts = Counter(c for (c,) in all_posts)
    items = [{"name": cat, "count": counts.get(cat, 0)} for cat in CATEGORIES]
    return {"categories": items}
```

- [ ] **Step 3: 更新 posts.py — 支持 category 过滤和返回**

在 `PostCreate` schema 中添加 `category: str = "其他"`。
在 `list_posts()` 中，在 query 后添加过滤：
```python
if category := request.query_params.get("category"):
    query = query.filter(Post.category == category)
```
实际上使用 FastAPI 的 Query 参数更干净。修改 `list_posts` 函数签名：
```python
def list_posts(
    page: int = 1,
    page_size: int = 10,
    category: str | None = None,  # 新增
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
```
添加过滤：
```python
if category:
    query = query.filter(Post.category == category)
```
在 `PostItem`、`PostCreate`、`PostDetail` 中都有 `category`。

`create_post` 接收 `request.category`。

- [ ] **Step 4: 注册到 main.py**

```python
from app.routes.categories import router as categories_router
app.include_router(categories_router)
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add post categories backend"
```

---

### Task 2: 帖子分类 — 前端

**Files:**
- Modify: `frontend/src/components/ShareModal.jsx` — 加分类选择器
- Modify: `frontend/src/pages/Home.jsx` — 加分类过滤栏
- Modify: `frontend/src/components/PostCard.jsx` — 显示分类 badge

- [ ] **Step 1: ShareModal 添加分类选择**

在标题/摘要输入框下方，添加分类选择区域：

```jsx
// 在 ShareModal.jsx 中，form step 的摘要 textarea 下方添加
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
```

添加 state: `const [category, setCategory] = useState('其他')`
在 `handlePublish` 中传入 `category`：
```jsx
await api.post('/posts', {
  conversation_id: shareConversationId,
  title: title.trim() || undefined,
  summary: summary.trim() || undefined,
  category: category,
})
```

- [ ] **Step 2: PostCard 显示分类 badge**

在卡片标题上方添加分类标签：

```jsx
{post.category && post.category !== '其他' && (
  <span className="badge mb-2" style={{ alignSelf: 'flex-start' }}>
    {post.category}
  </span>
)}
```

- [ ] **Step 3: Home.jsx 添加分类过滤栏**

在搜索栏下方添加一行分类过滤按钮：

```jsx
// 搜索栏与帖子列表之间
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
```

添加 state: `const [activeCategory, setActiveCategory] = useState(null)`

修改 `fetchPosts` 在 URL 中添加 `&category=${activeCategory}`：
```jsx
const url = `/posts?page=${page}&page_size=10${activeCategory ? `&category=${activeCategory}` : ''}`
```

当 activeCategory 变化时重置列表和分页：
```jsx
useEffect(() => {
  setPosts([])
  setPage(1)
  setHasMore(true)
  fetchPosts()
}, [activeCategory])
```

注意：要避免 fetchPosts 在依赖中捕获过时的 activeCategory。可以将 activeCategory 作为参数传入，或使用 ref。

- [ ] **Step 4: Build 验证**

```bash
cd frontend && npx vite build
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add post categories frontend"
```

---

### Task 3: 帖子收藏 — 后端

**Files:**
- Create: `backend/app/models/bookmark.py` — PostBookmark 模型
- Modify: `backend/app/models/__init__.py` — 注册新模型
- Create: `backend/app/routes/bookmarks.py` — 收藏/取消 + 列表
- Modify: `backend/app/routes/posts.py` — 返回 `is_bookmarked`、`bookmarks_count`
- Modify: `backend/app/main.py` — 注册

- [ ] **Step 1: 创建 PostBookmark 模型**

```python
# backend/app/models/bookmark.py
from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint
from app.core.database import Base


class PostBookmark(Base):
    __tablename__ = "post_bookmarks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="unique_user_post_bookmark"),
    )
```

模型 `Post` 添加字段：
```python
# backend/app/models/post.py — class Post 中添加
bookmarks_count = Column(Integer, default=0)
```

更新 `models/__init__.py`：
```python
from app.models.bookmark import PostBookmark
__all__ 中添加 "PostBookmark"
```

- [ ] **Step 2: 创建 bookmarks.py 路由**

```python
# backend/app/routes/bookmarks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.bookmark import PostBookmark
from app.models.post import Post
from app.models.user import User

router = APIRouter(tags=["收藏"])


class BookmarkResponse:
    def __init__(self, bookmarked: bool, bookmarks_count: int):
        self.bookmarked = bookmarked
        self.bookmarks_count = bookmarks_count


@router.post("/api/posts/{post_id}/bookmark")
def toggle_bookmark(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """切换收藏状态"""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="帖子不存在")

    existing = (
        db.query(PostBookmark)
        .filter(
            PostBookmark.user_id == current_user.id,
            PostBookmark.post_id == post_id,
        )
        .first()
    )

    if existing:
        db.delete(existing)
        post.bookmarks_count = max(0, post.bookmarks_count - 1)
        db.commit()
        return {"bookmarked": False, "bookmarks_count": post.bookmarks_count}
    else:
        bm = PostBookmark(user_id=current_user.id, post_id=post_id)
        db.add(bm)
        post.bookmarks_count += 1
        db.commit()
        return {"bookmarked": True, "bookmarks_count": post.bookmarks_count}


@router.get("/api/bookmarks")
def list_bookmarks(
    page: int = 1,
    page_size: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取我收藏的帖子列表"""
    query = (
        db.query(Post)
        .join(PostBookmark, PostBookmark.post_id == Post.id)
        .filter(PostBookmark.user_id == current_user.id)
        .order_by(PostBookmark.created_at.desc())
    )
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        items.append({
            "id": p.id,
            "title": p.title,
            "summary": p.summary,
            "username": p.user.username if p.user else None,
            "category": p.category,
            "likes_count": p.likes_count,
            "comments_count": p.comments_count,
            "bookmarks_count": p.bookmarks_count,
            "is_bookmarked": True,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        })

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "has_more": has_more}
```

- [ ] **Step 3: posts.py 增加 is_bookmarked 字段**

在 `list_posts()` 和 `get_post()` 中，在已有 `is_liked` 判断后增加：
```python
is_bookmarked = False
if current_user:
    is_bookmarked = (
        db.query(PostBookmark)
        .filter(
            PostBookmark.user_id == current_user.id,
            PostBookmark.post_id == p.id,
        )
        .first()
        is not None
    )
```

在 `PostItem` 和 `PostDetail` schema 中添加 `is_bookmarked: bool = False` 和 `bookmarks_count: int = 0`。

- [ ] **Step 4: 注册到 main.py**

```python
from app.routes.bookmarks import router as bookmarks_router
app.include_router(bookmarks_router)
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add bookmarks backend"
```

---

### Task 4: 帖子收藏 — 前端

**Files:**
- Modify: `frontend/src/pages/PostDetail.jsx` — 添加收藏按钮
- Modify: `frontend/src/components/PostCard.jsx` — 显示收藏数

- [ ] **Step 1: PostDetail 添加收藏按钮**

在点赞按钮旁边添加书签按钮：

```jsx
import { IconBookmark, IconBookmarkFilled } from '../components/Icons'

// 在点赞按钮后面添加
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
```

添加 state 和 handler：
```jsx
const [bookmarking, setBookmarking] = useState(false)

const handleBookmark = async () => {
  if (!user) { navigate('/login'); return }
  if (bookmarking) return
  setBookmarking(true)
  try {
    const { data } = await api.post(`/posts/${id}/bookmark`)
    setPost((prev) => ({
      ...prev,
      is_bookmarked: data.bookmarked,
      bookmarks_count: data.bookmarks_count,
    }))
  } catch { /* ignore */ }
  finally { setBookmarking(false) }
}
```

Icons.jsx 中添加两个图标（在已有图标后追加）：
```jsx
export function IconBookmark({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" />
    </svg>
  )
}

export function IconBookmarkFilled({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" />
    </svg>
  )
}
```

- [ ] **Step 2: PostCard 显示收藏数**

在底部元数据区域添加：
```jsx
{post.bookmarks_count !== undefined && (
  <span className="inline-flex items-center gap-1 text-xs">
    <IconBookmark className="icon" />
    {post.bookmarks_count || 0}
  </span>
)}
```

- [ ] **Step 3: Build 验证**

```bash
cd frontend && npx vite build
```

- [ ] **Step 4: 提交**

```bash
git add -A && git commit -m "feat: add bookmarks frontend"
```

---

### Task 5: 个人主页 — 后端

**Files:**
- Create: `backend/app/routes/users.py` — 用户信息/帖子/统计
- Modify: `backend/app/main.py` — 注册

- [ ] **Step 1: 创建 users.py 路由**

```python
# backend/app/routes/users.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_optional
from app.models.post import Post
from app.models.user import User
from app.models.comment import PostLike, Comment
from app.models.bookmark import PostBookmark

router = APIRouter(tags=["用户"])


@router.get("/api/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    """获取用户基本信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return {
        "id": user.id,
        "username": user.username,
        "avatar": user.avatar,
        "created_at": user.created_at.isoformat() if user.created_at else "",
    }


@router.get("/api/users/{user_id}/stats")
def get_user_stats(user_id: int, db: Session = Depends(get_db)):
    """获取用户统计"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    posts_count = db.query(Post).filter(Post.user_id == user_id).count()
    comments_count = db.query(Comment).filter(Comment.user_id == user_id).count()

    # 获赞数 = 该用户所有帖子获得的点赞总和
    total_likes = (
        db.query(PostLike)
        .join(Post, PostLike.post_id == Post.id)
        .filter(Post.user_id == user_id)
        .count()
    )

    return {
        "posts_count": posts_count,
        "comments_count": comments_count,
        "total_likes": total_likes,
    }


@router.get("/api/users/{user_id}/posts")
def get_user_posts(
    user_id: int,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
):
    """获取该用户发布的帖子"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    query = (
        db.query(Post)
        .filter(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
    )
    total = query.count()
    posts = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for p in posts:
        is_liked = False
        is_bookmarked = False
        if current_user:
            is_liked = db.query(PostLike).filter(PostLike.user_id == current_user.id, PostLike.post_id == p.id).first() is not None
            is_bookmarked = db.query(PostBookmark).filter(PostBookmark.user_id == current_user.id, PostBookmark.post_id == p.id).first() is not None
        items.append({
            "id": p.id, "title": p.title, "summary": p.summary,
            "username": user.username, "category": p.category,
            "likes_count": p.likes_count, "comments_count": p.comments_count,
            "bookmarks_count": p.bookmarks_count,
            "is_liked": is_liked, "is_bookmarked": is_bookmarked,
            "created_at": p.created_at.isoformat() if p.created_at else "",
        })

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "has_more": has_more}
```

- [ ] **Step 2: 注册到 main.py**

```python
from app.routes.users import router as users_router
app.include_router(users_router)
```

- [ ] **Step 3: 提交**

```bash
git add -A && git commit -m "feat: add user profile backend"
```

---

### Task 6: 个人主页 — 前端

**Files:**
- Create: `frontend/src/pages/UserProfile.jsx`
- Modify: `frontend/src/App.jsx` — 注册路由
- Modify: `frontend/src/components/Navbar.jsx` — 用户名链接到主页

- [ ] **Step 1: 创建 UserProfile 页面**

```jsx
// frontend/src/pages/UserProfile.jsx
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

  useEffect(() => {
    fetchUser()
  }, [id])

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
      {/* 用户信息 */}
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

      {/* 统计 */}
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

      {/* Tab 切换 */}
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

      {/* 帖子列表 */}
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
```

- [ ] **Step 2: App.jsx 添加路由**

```jsx
import UserProfile from './pages/UserProfile'
// 在 Routes 中添加:
<Route path="/user/:id" element={<UserProfile />} />
```

- [ ] **Step 3: Navbar.jsx 用户名加链接**

将用户名 `<span>{user.username}</span>` 替换为：
```jsx
<Link to={`/user/${user.id}`} className="inline-flex items-center gap-1.5 text-sm hover:underline"
  style={{ color: 'var(--color-text-muted)' }}>
  <IconUser className="icon" />
  {user.username}
</Link>
```

- [ ] **Step 4: Build 验证**

```bash
cd frontend && npx vite build
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add user profile page"
```

---

### Task 7: 通知系统 — 后端

**Files:**
- Create: `backend/app/models/notification.py` — Notification 模型
- Modify: `backend/app/models/__init__.py` — 注册
- Create: `backend/app/routes/notifications.py` — 列表/未读/全读
- Modify: `backend/app/routes/comments.py` — 评论/回复时创建通知
- Modify: `backend/app/routes/posts.py` — 点赞时创建通知
- Modify: `backend/app/routes/bookmarks.py` — 收藏时创建通知
- Modify: `backend/app/main.py` — 注册

- [ ] **Step 1: 创建 Notification 模型**

```python
# backend/app/models/notification.py
from datetime import datetime

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(20), nullable=False)  # comment / reply / like / bookmark
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    comment_id = Column(Integer, nullable=True)
    post_title = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

更新 `models/__init__.py`：
```python
from app.models.notification import Notification
__all__ 中添加 "Notification"
```

- [ ] **Step 2: 创建 notifications.py 路由**

```python
# backend/app/routes/notifications.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter(tags=["通知"])


@router.get("/api/notifications")
def list_notifications(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取通知列表（最新在前）"""
    query = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
    )
    total = query.count()
    notifications = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for n in notifications:
        actor = db.query(User).filter(User.id == n.actor_id).first()
        items.append({
            "id": n.id,
            "type": n.type,
            "actor_username": actor.username if actor else "用户",
            "post_id": n.post_id,
            "post_title": n.post_title,
            "comment_id": n.comment_id,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else "",
        })

    has_more = (page * page_size) < total
    return {"items": items, "total": total, "unread_count": sum(1 for n in notifications if not n.is_read), "has_more": has_more}


@router.get("/api/notifications/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """未读通知数量"""
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .count()
    )
    return {"count": count}


@router.post("/api/notifications/read-all")
def read_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """全部标为已读"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"ok": True}
```

- [ ] **Step 3: 创建通知辅助函数**

在 `routes/__init__.py` 或新建 `routes/notification_helper.py`：

```python
# backend/app/routes/notification_helper.py
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.post import Post


def create_notification(
    db: Session,
    user_id: int,
    actor_id: int,
    type: str,
    post_id: int,
    comment_id: int | None = None,
):
    """创建通知（不自通知：自己操作自己时跳过）"""
    if user_id == actor_id:
        return
    post = db.query(Post).filter(Post.id == post_id).first()
    notification = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        post_id=post_id,
        comment_id=comment_id,
        post_title=post.title[:100] if post and post.title else None,
    )
    db.add(notification)
```

- [ ] **Step 4: 在 comments.py 中集成通知**

在 `create_comment` 函数中，`db.commit()` 前添加：
```python
from app.routes.notification_helper import create_notification
create_notification(db, post.user_id, current_user.id, "comment", post_id)
```

在 `reply_comment` 函数中，`db.commit()` 前添加：
```python
create_notification(db, parent.user_id, current_user.id, "reply", parent.post_id, parent.id)
```

- [ ] **Step 5: 在 posts.py 中集成通知**

在 `toggle_like` 函数的 `else` 分支（点赞时），`db.commit()` 前添加：
```python
from app.routes.notification_helper import create_notification
create_notification(db, post.user_id, current_user.id, "like", post_id)
```

- [ ] **Step 6: 在 bookmarks.py 中集成通知**

在 `toggle_bookmark` 函数的 `else` 分支（收藏时），`db.commit()` 前添加：
```python
from app.routes.notification_helper import create_notification
create_notification(db, post.user_id, current_user.id, "bookmark", post_id)
```

- [ ] **Step 7: 注册到 main.py**

```python
from app.routes.notifications import router as notifications_router
app.include_router(notifications_router)
```

- [ ] **Step 8: 提交**

```bash
git add -A && git commit -m "feat: add notifications backend"
```

---

### Task 8: 通知系统 — 前端

**Files:**
- Create: `frontend/src/components/NotificationBell.jsx` — 铃铛 + 下拉
- Modify: `frontend/src/components/Navbar.jsx` — 集成通知铃铛
- Modify: `frontend/src/components/Icons.jsx` — 添加 IconBell 图标

- [ ] **Step 1: Icons.jsx 添加 IconBell**

```jsx
export function IconBell({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" />
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6945 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3055 21.9044 11.0018 21.7295C10.6981 21.5547 10.4458 21.3031 10.27 21" />
    </svg>
  )
}
```

- [ ] **Step 2: 创建 NotificationBell 组件**

```jsx
// frontend/src/components/NotificationBell.jsx
import { useState, useEffect, useRef } from 'react'
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

  // 轮询未读数
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await api.get('/notifications/unread-count')
        setUnreadCount(data.count)
      } catch { /* ignore */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // 点击外部关闭
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
    navigate(`/post/${n.post_id}`)
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
            style={{ backgroundColor: 'var(--color-danger, oklch(0.65 0.18 30))', fontSize: '9px', lineHeight: 1 }}>
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
                      backgroundColor: n.is_read ? 'transparent' : 'var(--color-brand-900)',
                    }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-card)'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'var(--color-brand-900)'}>
                    <IconComp className="icon mt-0.5" style={{ color: 'var(--color-brand-400)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--color-text-body)' }}>
                        <span style={{ color: 'var(--color-brand-300)' }}>{n.actor_username}</span>
                        {n.type === 'comment' && ' 评论了你的帖子'}
                        {n.type === 'reply' && ' 回复了你的评论'}
                        {n.type === 'like' && ' 赞了你的帖子'}
                        {n.type === 'bookmark' && ' 收藏了你的帖子'}
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
```

- [ ] **Step 3: Navbar.jsx 集成通知铃铛**

在用户相关按钮区域，用户名之前或之后添加：
```jsx
import NotificationBell from './NotificationBell'

// 在 username 显示之前（或之后）添加:
<NotificationBell />
```

- [ ] **Step 4: Build 验证**

```bash
cd frontend && npx vite build
```

- [ ] **Step 5: 提交**

```bash
git add -A && git commit -m "feat: add notification frontend"
```

---

## 实施顺序

| 序号 | 任务 | 依赖 |
|------|------|------|
| 1 | 帖子分类 — 后端 | 无 |
| 2 | 帖子分类 — 前端 | 任务 1 |
| 3 | 帖子收藏 — 后端 | 无 |
| 4 | 帖子收藏 — 前端 | 任务 3 |
| 5 | 个人主页 — 后端 | 无 |
| 6 | 个人主页 — 前端 | 任务 4、5 |
| 7 | 通知系统 — 后端 | 任务 3 |
| 8 | 通知系统 — 前端 | 任务 7 |

> 注意：任务 3 和 5 可以并行，任务 1 和 3 也可以并行。推荐顺序：1→2→3→4→5→6→7→8。
