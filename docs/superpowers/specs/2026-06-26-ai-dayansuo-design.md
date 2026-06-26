# AI答研所 — 完整设计文档

> 版本：v1.0 | 日期：2026-06-26 | 状态：已确认

---

## 一、项目概述

**定位**：AI 回答的探讨与验证社区。

**核心理念**：AI 出答案，人来定对错。

**核心流程**：
```
用户提问 → AI 回答 → 用户存入/分享 → 广场展示 → 他人评论/点赞/讨论
```

**三层价值**：

| 层级 | 价值 |
|------|------|
| 第一层 | 用户获得 AI 回答（私有用） |
| 第二层 | 用户分享回答（公共化） |
| 第三层 | 他人审视、讨论、验证（社区化） |

---

## 二、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | FastAPI | Python 异步框架 |
| 数据库 | MySQL | SQLAlchemy ORM |
| 认证 | JWT（access_token + refresh_token） | 无状态认证 |
| 密码 | bcrypt | passlib |
| AI | DeepSeek API（deepseek-v4-flash 模型） | 流式 SSE 输出 |
| 验证码 | Cloudflare Turnstile | 注册 + 登录 |
| 前端 | React + Vite + Tailwind | 前后端分离 |
| 状态管理 | Zustand | 轻量 |
| API 请求 | React Query | 缓存与状态 |

---

## 三、数据库设计

### 3.1 用户表（users）

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 对话表（conversations）

```sql
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(255) DEFAULT '新对话',
    is_saved BOOLEAN DEFAULT FALSE,
    saved_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3.3 消息表（messages）

```sql
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    reasoning_content TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

> `reasoning_content` 字段存储 DeepSeek 的思考过程内容。

### 3.4 帖子表（posts）

```sql
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    conversation_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    full_content TEXT NOT NULL,
    reasoning_content TEXT DEFAULT NULL,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
```

### 3.5 评论表（comments）

```sql
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_id INT DEFAULT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
```

### 3.6 点赞表（post_likes）

```sql
CREATE TABLE post_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
```

---

## 四、API 接口设计

### 4.1 用户认证

| 方法 | 路径 | 说明 | 限流 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（含 Turnstile 验证） | 5次/分钟 |
| POST | `/api/auth/login` | 登录（含 Turnstile 验证） | 5次/分钟 |
| POST | `/api/auth/refresh` | 刷新 access_token | 60次/分钟 |

**注册请求体**：
```json
{
  "username": "string",
  "password": "string",
  "email": "string | null",
  "turnstile_token": "string"
}
```

**登录响应**：
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": { "id": 1, "username": "string", "avatar": null }
}
```

### 4.2 对话

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| GET | `/api/conversations` | 获取已保存的对话列表 | ✅ |
| POST | `/api/conversations` | 创建新对话 | ✅ |
| DELETE | `/api/conversations/{id}` | 删除对话 | ✅ |
| GET | `/api/conversations/{id}/messages` | 获取对话消息列表（只读查看用） | ✅ |
| POST | `/api/conversations/{id}/messages` | 发送消息，SSE 流式返回 AI 回答 | ✅ |
| POST | `/api/conversations/{id}/save` | 存入（保存对话 + 生成摘要） | ✅ |

**发送消息 SSE 响应格式**：
```
data: {"type": "reasoning", "content": "正在思考..."}
data: {"type": "reasoning", "content": "深层次分析..."}
data: {"type": "content", "content": "最终答案..."}
data: {"type": "content", "content": "继续输出..."}
data: {"type": "done", "content": ""}
```

### 4.3 帖子

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| GET | `/api/posts` | 广场帖子列表（无限滚动分页） | ❌ |
| POST | `/api/posts` | 发布帖子（从已保存对话创建） | ✅ |
| GET | `/api/posts/{id}` | 帖子详情 | ❌ |
| DELETE | `/api/posts/{id}` | 删除帖子（仅作者） | ✅ |
| POST | `/api/posts/{id}/like` | 点赞/取消点赞（toggle） | ✅ |

**GET /api/posts 查询参数**：`?page=1&page_size=10`
- 返回 `{ items: [...], next_page: 2|null, has_more: bool }`

### 4.4 评论

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| GET | `/api/posts/{id}/comments` | 获取帖子的评论列表 | ❌ |
| POST | `/api/posts/{id}/comments` | 发布一级评论 | ✅ |
| POST | `/api/comments/{id}/replies` | 回复一级评论（二级评论） | ✅ |
| DELETE | `/api/comments/{id}` | 删除评论（评论者或帖子作者） | ✅ |

**GET /api/posts/{id}/comments 响应**：
```json
[
  {
    "id": 1,
    "user": { "id": 1, "username": "张三" },
    "content": "一级评论",
    "created_at": "2026-06-26T12:00:00",
    "replies": [
      { "id": 2, "user": { "id": 2, "username": "李四" }, "parent_id": 1, "content": "回复", ... }
    ],
    "replies_count": 5,
    "display_replies": 2
  }
]
```

### 4.5 搜索

| 方法 | 路径 | 说明 | 需登录 |
|------|------|------|--------|
| GET | `/api/search?q={keyword}` | 搜索帖子（标题+摘要+内容） | ❌ |

---

## 五、前端页面与组件设计

### 5.1 页面路由

| 路径 | 页面 | 登录要求 |
|------|------|---------|
| `/` | 广场（帖子列表） | ❌ |
| `/login` | 登录页 | ❌（已登录则跳转 /） |
| `/register` | 注册页 | ❌（已登录则跳转 /） |
| `/chat` | 对话页 | ✅ |
| `/post/{id}` | 帖子详情页 | ❌ |

### 5.2 组件树

```
App
├── Navbar（搜索框 + 用户头像/登录按钮）
├── Routes
│   ├── 广场页
│   │   ├── PostCard（帖子卡片，无限滚动列表）
│   │   └── EmptyState（空状态引导）
│   ├── 登录页
│   │   └── LoginForm（含 Turnstile）
│   ├── 注册页
│   │   └── RegisterForm（含 Turnstile）
│   ├── 对话页
│   │   ├── ConversationSidebar（已保存对话列表）
│   │   ├── ChatWindow
│   │   │   ├── MessageList
│   │   │   │   ├── UserMessage
│   │   │   │   └── AssistantMessage（含可折叠思考过程）
│   │   │   ├── ChatInput（动态 placeholder）
│   │   │   └── ActionButtons（存入/继续聊/新话题）
│   │   └── ShareModal（分享弹窗）
│   └── 帖子详情页
│       ├── PostContent（Markdown 渲染）
│       ├── LikeButton（toggle 点赞）
│       └── CommentList
│           ├── CommentItem（一级评论）
│           │   ├── ReplyList（二级评论，默认显示2条）
│           │   └── ReplyInput
│           └── CommentInput
```

### 5.3 Zustand Store 设计

```javascript
const useStore = create((set, get) => ({
  // === 用户 ===
  user: null,
  token: null,
  refreshToken: null,

  // === 当前对话 ===
  currentConversation: {
    id: null,
    messages: [],
    isSaved: false,
    roundCount: 0,
  },

  // === 已保存对话列表（侧边栏） ===
  savedConversations: [],
  selectedSavedId: null,

  // === 广场帖子 ===
  posts: [],
  postsPage: 1,
  postsHasMore: true,

  // === 帖子详情 ===
  currentPost: null,
  comments: [],

  // === 搜索 ===
  searchKeyword: '',
  searchResults: [],

  // === UI 状态 ===
  isStreaming: false,
  showShareModal: false,
  streamingContent: '',
  streamingReasoning: '',
}));
```

### 5.4 未保存对话持久化

- 使用 `localStorage` 存储未保存的 `currentConversation`
- key: `ai_dayansuo_draft`
- 刷新页面后从 localStorage 恢复
- 用户点击「存入」或「新话题」后清除 localStorage 中的草稿

---

## 六、AI 交互详细设计

### 6.1 调用流程

```
前端 POST /api/conversations/{id}/messages
       ↓
后端接收消息，构造 DeepSeek API 请求
       ↓
后端 POST https://api.deepseek.cn/chat/completions (stream=true)
       ↓
后端逐块解析 DeepSeek SSE 流
  → reasoning_content 字段 → 透传给前端
  → content 字段 → 透传给前端
       ↓
前端逐块渲染：
  1. reasoning_content → 灰色斜体可折叠区域，流式追加
  2. content → 主回答区域，流式 Markdown 渲染
       ↓
流结束后后端保存消息到 MySQL
       ↓
前端显示三按钮（存入/继续聊/新话题）
```

### 6.2 上下文管理

- 每次发送消息时，将当前对话的**所有历史消息**作为上下文传给 DeepSeek API
- 消息格式：`[{ role: "user"|"assistant", content: "..." }]`
- 思考过程（reasoning_content）不放入上下文，只放最终 content

### 6.3 错误处理

| 错误类型 | 处理方式 |
|---------|---------|
| DeepSeek API 超时 | 重试 2 次，间隔 1s，仍失败则提示"AI 服务暂时不可用，请稍后再试" |
| DeepSeek API 返回空内容 | 提示"AI 返回为空，请重试" |
| 网络中断 | 前端提示"网络连接已断开"，保留已接收的流式内容 |
| Token 耗尽（API Key 额度） | 提示"API 额度已用尽，请联系管理员" |

### 6.4 摘要生成

- 用户在对话页点击「存入」时触发
- 后端将完整对话发送给 DeepSeek API（非流式），要求生成：
  - 标题（≤30字）
  - 摘要（50-100字）
- 提示词示例：
  ```
  请根据以下对话，生成一个标题（不超过30字）和一段摘要（50-100字）。
  标题要简洁概括核心话题，摘要要提炼关键问题和答案。
  
  对话内容：
  ...
  
  输出格式：
  标题：xxx
  摘要：xxx
  ```

---

## 七、UI/UX 详细设计

### 7.1 三个按钮视觉状态

| 按钮 | 默认状态 | 悬停 | 点击后 |
|------|---------|------|--------|
| 💾 存入 | 次要按钮（outline） | 边框加深 | 保存成功→弹出分享窗；已有记录→确认弹窗 |
| 💬 继续聊 | 主要按钮（高亮填充） | 颜色加深 | placeholder 变警告，继续对话 |
| 📂 新话题 | 次要按钮（outline） | 边框加深 | 清空对话，恢复干净 placeholder |

- 默认 Enter 触发「继续聊」
- 「存入」快捷键：Cmd/Ctrl + S
- 三按钮在 AI 回答**完全输出结束后**才出现

### 7.2 Placeholder 状态机

| 状态 | 触发条件 | Placeholder 文字 |
|------|---------|-----------------|
| 新建 | 刚进入对话页 / 新话题后 | 💬 你想问什么？ |
| 未保存1轮 | 已有1轮对话未存入 | ⚠️ 当前对话未保存，继续问 AI 可能会忘记前文 |
| 未保存N轮 | 已有N轮（N≥2）未存入 | ⚠️ 有 N 轮未保存，AI 可能已遗忘部分内容 |
| 已保存 | 当前对话已存入 | 💬 继续提问，AI 会记住上下文 |

### 7.3 思考过程展示

- 位置：AI 回答框的上方
- 样式：灰色（`text-gray-500`）、斜体（`italic`）、较小字号（`text-sm`）
- 可折叠：默认显示展开按钮，内容区域带 `max-h` 限制，点击展开全部
- 流式输出时逐步追加

### 7.4 状态覆盖

| 状态 | 视觉效果 |
|------|---------|
| 加载中（AI 响应） | 输入框禁用 + 发送按钮变 loading 动画 |
| 空态（广场无帖子） | 插画 + 引导文案 + 按钮「去提问」 |
| 空态（搜索无结果） | "未找到相关结果，试试其他关键词" |
| 错误态 | 红色提示条 + 重试按钮 |
| 流式中断 | 保留已收到内容 + 提示"连接中断，部分内容可能不完整" |

### 7.5 响应式适配

- 对话页：桌面端侧边栏常驻，移动端侧边栏可滑出（drawer）
- 广场页：桌面多列卡片，移动端单列
- 帖子详情：全宽内容区

---

## 八、安全设计

### 8.1 JWT 认证

- **access_token**：有效期 24 小时，存储在内存（Zustand store）中
- **refresh_token**：有效期 7 天，存储在 `localStorage` 中
- 刷新机制：前端在 401 时自动使用 refresh_token 换取新 access_token
- refresh_token 失效后跳转登录页

### 8.2 接口限流

| 分组 | 限制 | 实现方式 |
|------|------|---------|
| 登录/注册 | 5次/分钟/IP | 内存限流（slowapi） |
| 一般接口 | 60次/分钟/IP | 内存限流（slowapi） |
| AI 对话 | 30次/分钟/用户 | 基于用户 ID 限流 |

### 8.3 其他安全措施

- **密码**：bcrypt 加密存储
- **XSS 防护**：前端 Markdown 渲染使用 `react-markdown` + `rehype-sanitize`，过滤危险标签
- **CORS**：后端配置允许的前端域名
- **SQL 注入**：SQLAlchemy ORM 天然防护
- **敏感信息**：API Key 存储在 `.env` 文件中，`.gitignore` 排除

---

## 九、限流与速率控制

| 接口分组 | 限流规则 | 实现 |
|---------|---------|------|
| POST /api/auth/* | 5 次/分钟/IP | slowapi + Redis（可选） |
| 其他 POST/PUT/DELETE | 30 次/分钟/用户 | slowapi |
| GET 请求 | 60 次/分钟/IP | slowapi |
| AI 对话 | 30 次/分钟/用户 | 自定义中间件 |

超出限制返回 HTTP 429：
```json
{
  "detail": "请求过于频繁，请稍后再试"
}
```

---

## 十、种子数据与冷启动

**策略**：不内置种子数据，采用空状态引导。

广场空态页面：
```
┌─────────────────────────────────┐
│                                 │
│      🧪 还没有人分享内容         │
│   去提问并分享第一个AI回答吧！    │
│                                 │
│         [ 🚀 去提问 ]           │
│                                 │
└─────────────────────────────────┘
```

---

## 十一、目录结构

```
ai_dayansuo/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 应用入口
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py        # 配置管理（.env）
│   │   │   ├── database.py      # 数据库连接
│   │   │   ├── security.py      # JWT 生成/验证
│   │   │   └── limiter.py       # 限流配置
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── post.py
│   │   │   └── comment.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── conversation.py
│   │   │   ├── post.py
│   │   │   └── comment.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── conversations.py
│   │   │   ├── posts.py
│   │   │   ├── comments.py
│   │   │   └── search.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ai_service.py      # DeepSeek API 调用
│   │   │   ├── summarizer.py      # 摘要生成
│   │   │   └── conversation_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── logger.py
│   ├── requirements.txt
│   ├── .env                      # API Key 等敏感配置
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Home.jsx          # 广场页
│   │   │   ├── Chat.jsx          # 对话页
│   │   │   └── PostDetail.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PostCard.jsx
│   │   │   ├── CommentList.jsx
│   │   │   ├── ShareModal.jsx
│   │   │   ├── ActionButtons.jsx
│   │   │   └── ConversationSidebar.jsx
│   │   ├── api/
│   │   │   └── index.js          # axios 实例 + 拦截器
│   │   ├── store/
│   │   │   └── useStore.js       # Zustand store
│   │   └── hooks/
│   │       └── useAuth.js
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-26-ai-dayansuo-design.md
├── uploads/                      # 用户头像上传目录
├── .gitignore
└── README.md
```

---

## 十二、开发阶段规划

### Phase 1（优先）：用户 + 对话 + 三按钮

- [ ] 后端项目脚手架（FastAPI + SQLAlchemy + 数据库初始化）
- [ ] 用户注册/登录 API（含 JWT + Turnstile）
- [ ] 前端项目脚手架（React + Vite + Tailwind + Zustand）
- [ ] 登录/注册页面
- [ ] 对话 CRUD API
- [ ] 流式 AI 对话（DeepSeek API + SSE）
- [ ] 三按钮交互（存入/继续聊/新话题）
- [ ] 动态 Placeholder
- [ ] 未保存对话 localStorage 持久化

### Phase 2（核心）：分享 + 广场

- [ ] AI 摘要生成 API
- [ ] 分享弹窗
- [ ] 帖子发布 API
- [ ] 广场列表页（无限滚动）
- [ ] 帖子详情页（Markdown 渲染 + 思考过程展示）
- [ ] 空状态引导

### Phase 3（社交）：评论 + 点赞

- [ ] 一级评论 API + 前端
- [ ] 二级评论（楼中楼）+ 前端
- [ ] 帖子点赞（toggle）API + 前端
- [ ] 评论删除（评论者 + 帖子作者）

### Phase 4（增强）：搜索 + 优化

- [ ] 搜索 API（LIKE 模糊匹配）
- [ ] 搜索前端组件
- [ ] 响应式适配
- [ ] 接口限流集成
- [ ] 错误边界处理

---

## 十三、后续扩展方向（暂不实现）

- 用户个人主页
- 收藏帖子功能
- 富文本编辑器
- 多模型切换
- 帖子标签/分类
- 管理员后台

---

## 十四、核心原则（重申）

> **AI 出答案，人来定对错。**

这个产品的灵魂不是"又一个 AI 对话工具"，而是"AI 答案的检验场"。每个设计决策都应该服务于让用户**审视、质疑、验证** AI 答案这个核心目标。
