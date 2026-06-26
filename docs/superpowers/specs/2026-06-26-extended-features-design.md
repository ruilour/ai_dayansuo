# AI答研所 — 扩展功能设计

> 对应 Phase 1-4 完成后的功能扩展：帖子分类、个人主页、帖子收藏、通知系统。

---

## 1. 帖子分类

### 数据库

`posts` 表新增字段：

```python
category = Column(String(20), default="其他", nullable=False)
```

### 预设分类

| 分类 | 标签色 |
|------|--------|
| 技术 | brand-400 |
| 科学 | brand-300 |
| 生活 | brand-200 |
| 学习 | brand-500 |
| 创意 | brand-600 |
| 其他 | brand-100 |

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取分类列表及各分类帖子数 |
| POST | `/api/posts` | 创建时接受 `category` 字段 |
| GET | `/api/posts?category=技术` | 按分类过滤 |

### 前端

- **ShareModal**：标题/摘要下方加一排分类标签按钮（6 个圆角 pill 按钮），选中态品牌色填充
- **Home（广场）**：标题下方加一行分类过滤按钮，点击切换，选中态高亮；默认"全部"
- **PostCard**：标题上方或右上角显示分类 badge

---

## 2. 个人主页

### 数据库

无需新表，聚合现有 `posts`、`comments`、`post_likes` 数据。

### API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users/{id}/posts` | 获取该用户的帖子列表（分页） |
| GET | `/api/users/{id}/stats` | 帖子数、获赞数、评论数 |
| GET | `/api/users/{id}` | 用户基本信息 |

### 前端

- **路由**：`/user/:id`
- **页面结构**：
  - 顶部：首字母圆形头像 + 用户名 + 加入时间
  - 统计栏：帖子 N · 获赞 N · 评论 N
  - Tab 切换："发布的帖子" / "收藏的帖子"
  - 帖子列表复用 PostCard 组件
- **导航栏**：点击用户名跳转到 `/user/{id}`

### 不做的
- 编辑个人资料
- 关注/粉丝
- 个人主页装修

### 收藏与点赞联动

`POST /api/posts/{id}/bookmark` 返回体与点赞一致：

```json
{"bookmarked": true, "bookmarks_count": 5}
```

收藏操作同时触发 `bookmark` 类通知（通知帖子作者有人收藏了帖子）。

---

## 3. 帖子收藏

### 数据库

新建 `post_bookmarks` 表：

```sql
CREATE TABLE post_bookmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_bookmark (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

`posts` 表新增 `bookmarks_count` 字段（`INT DEFAULT 0`）。

### API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/posts/{id}/bookmark` | 切换收藏/取消 | ✅ |
| GET | `/api/bookmarks` | 获取我的收藏列表 | ✅ |
| GET | `/api/posts/{id}` | 增加 `is_bookmarked` 字段 | ❌ |
| GET | `/api/posts` | 增加 `is_bookmarked` 字段（登录时） | ❌ |

### 前端

- 帖子详情页：点赞按钮旁加书签按钮（`IconBookmark`），填充态表示已收藏
- 个人主页："收藏的帖子" Tab 调用 `/api/bookmarks`
- PostCard：底部增加收藏图标显示
- 切换收藏时更新计数，不做 loading 态（乐观更新）

### 收藏与点赞联动

`POST /api/posts/{id}/bookmark` 返回体：

```json
{"bookmarked": true, "bookmarks_count": 5}
```

收藏操作在收藏时触发 `bookmark` 类通知（取消时不触发）。

---

## 4. 通知系统

### 数据库

新建 `notifications` 表：

```sql
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    actor_id INT NOT NULL,
    type VARCHAR(20) NOT NULL,     -- comment / reply / like / bookmark
    post_id INT NOT NULL,
    comment_id INT DEFAULT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

### 触发时机

| 操作 | 通知类型 | 接收者 |
|------|----------|--------|
| 评论帖子 | `comment` | 帖子作者 |
| 回复评论 | `reply` | 原评论作者 |
| 点赞帖子 | `like` | 帖子作者 |
| 收藏帖子 | `bookmark` | 帖子作者 |

**不给自己发通知**：操作者 == 接收者时跳过。

### API

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/notifications` | 获取通知列表（分页，最新在前） | ✅ |
| GET | `/api/notifications/unread-count` | 未读数量 | ✅ |
| POST | `/api/notifications/read-all` | 全部标为已读 | ✅ |

### 通知创建集成点

通知在以下后端操作中自动创建：

| 操作 | 函数 | type | 接收者 |
|------|------|------|--------|
| 评论帖子 | `comments.py:create_comment()` | `comment` | 帖子作者 |
| 回复评论 | `comments.py:reply_comment()` | `reply` | 原评论作者 |
| 点赞帖子 | `posts.py:toggle_like()` | `like` | 帖子作者（仅点赞时） |
| 收藏帖子 | 新 `bookmarks.py:toggle_bookmark()` | `bookmark` | 帖子作者（仅收藏时） |

**不自通知**：若 `actor_id == user_id`，跳过。

### 前端
- **通知下拉**：点击铃铛展开最近 10 条通知列表
- **通知项**：图标 + 文案 + 相对时间；未读的用浅紫色背景
- **全读按钮**：通知列表底部"全部标为已读"
- 点击通知：跳转到帖子详情页 + 标记该条已读
- 轮询：每 30 秒查询 `/notifications/unread-count`

### 通知文案

```
{actor} 评论了你的帖子「{title}」
{actor} 回复了你的评论
{actor} 赞了你的帖子「{title}」
{actor} 收藏了你的帖子「{title}」
```
