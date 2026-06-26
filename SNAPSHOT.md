# AI答研所 — 项目快照

> 生成时间: 2026-06-26
> 下次启动后先看此文件恢复上下文。

---

## 项目概述

「AI答研所」— AI 给出答案，人来判断对错。

用户提问 → AI 流式回答（DeepSeek v4-flash）→ 保存对话 → 发布到广场 → 他人浏览/点赞/评论（Phase 3）。

---

## 当前运行状态

| 服务 | 地址 | 命令 |
|------|------|------|
| 后端 API | `http://localhost:8000` | `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` |
| 前端页面 | `http://localhost:5173` | `cd frontend && npx vite --host 0.0.0.0 --port 5173` |

两个进程可能已停止，启动后需要重新运行以上命令。

---

## 已完成的功能

### Phase 1 ✅ — 用户系统 + 对话 + 三按钮

- [x] 注册/登录（JWT access_token 24h + refresh_token 7d）
- [x] 限流（slowapi：注册 5/min，登录 5/min，刷新 10/min）
- [x] Turnstile 验证（开发模式跳过，`TURNSTILE_SECRET_KEY=` 为空）
- [x] AI 流式对话（SSE，DeepSeek API，展示 reasoning_content）
- [x] 三按钮：存入 / 继续聊 / 新话题
- [x] 对话侧边栏（已保存对话列表）
- [x] 草稿自动保存到 localStorage（key: `ai_dayansuo_draft`）
- [x] 401 自动刷新 token

### Phase 2 ✅ — 分享 + 广场

- [x] AI 摘要服务（自动生成标题+摘要）
- [x] 发布帖子（从已保存对话创建）
- [x] 广场列表（无限滚动分页，未登录可看）
- [x] 帖子详情页（显示完整对话+推理过程）
- [x] 点赞/取消点赞
- [x] ShareModal 三步交互：存入成功 → 编辑标题摘要 → 发布成功

### Phase 3 ✅ — 评论系统

- [x] 后端评论 API（GET / POST / DELETE + 二级回复）
- [x] CommentList 组件（递归渲染一级+二级评论）
- [x] 帖子详情页评论区集成
- [x] 评论计数自动更新

### Phase 4 ✅ — 搜索 + 优化

- [x] 搜索后端 API（标题/摘要模糊匹配，分页）
- [x] 广场顶部搜索栏，原位展示结果
- [x] Esc 清除搜索，一键清空按钮
- [x] 帖子卡片等高布局（标题 line-clamp-2，摘要 line-clamp-3）
- [x] 响应式网格（小屏自动单列）

---

## 最近修复的问题

1. **`bcrypt 5.0.0` 与 `passlib 1.7.4` 不兼容** → 降级到 `bcrypt 4.1.3`
2. **slowapi 限流装饰器参数冲突** → `auth.py` 中函数参数 `request: Xxx` → `request: Request, body: Xxx`
3. **Turnstile key 占位符** → `.env` 中清空 `TURNSTILE_SECRET_KEY`
4. **DeepSeek API 域名错误** → `api.deepseek.cn` → `api.deepseek.com`
5. **广场重复帖子** → Home.jsx 用 `fetchingRef` 防并发、按 ID 去重
6. **CSS `@apply font-display` 500 错误** → 替换为直接写 `font-family`
7. **`IconChevronLeft` 未导出** → 补充导出，全面交叉校验所有导入

---

## 数据库

- **引擎**: MySQL 8（`ai_dayansuo`）
- **用户**: `root` / 密码 `ruil`
- **连接串**: `mysql+pymysql://root:ruil@localhost:3306/ai_dayansuo?charset=utf8mb4`
- **6 张表**: `users`, `conversations`, `messages`, `posts`, `comments`, `post_likes`

### 已有数据

- 测试用户 `finaltest`（密码 `test123456`）— 可继续使用
- 已发布 1 条帖子（ID=1，「人工智能历史简介」）

---

## 环境配置

`.env` 文件（`backend/.env`）：

```
DATABASE_URL=mysql+pymysql://root:ruil@localhost:3306/ai_dayansuo?charset=utf8mb4
SECRET_KEY=your-secret-key-change-in-production-abc123
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY
DEEPSEEK_MODEL=deepseek-v4-flash
TURNSTILE_SECRET_KEY=
```

**⚠️ 部署前必须改**: `SECRET_KEY` 仍是默认值。

---

## 文件结构

### 后端 `backend/`

```
backend/
  app/
    main.py                    # 入口，CORS，路由注册
    core/
      config.py                # Settings（.env）
      database.py              # SQLAlchemy 引擎 + Session
      security.py              # JWT + bcrypt + get_current_user
      limiter.py               # slowapi 限流
    models/
      user.py                  # User
      conversation.py          # Conversation
      message.py               # Message
      post.py                  # Post
      comment.py               # Comment + PostLike
    schemas/
      auth.py                  # UserRegister, UserLogin, TokenRefresh, TokenResponse, UserResponse
      conversation.py          # ConversationCreate, MessageSend, MessageResponse, ConversationResponse, ConversationSave
    routes/
      auth.py                  # /api/auth/register, login, refresh
      conversations.py         # /api/conversations CRUD + SSE 流 + save + delete
      posts.py                 # /api/posts 列表、创建、详情、点赞
    services/
      ai_service.py            # DeepSeek API 流式调用
      summarizer.py            # DeepSeek 生成标题+摘要（Phase 2 新增）
    utils/
      logger.py                # 日志
```

### 前端 `frontend/`

```
frontend/
  src/
    App.jsx                    # 路由：/, /login, /register, /chat, /post/:id
    api/index.js               # Axios 实例 + 401 自动刷新
    store/useStore.js          # Zustand 全局状态
    hooks/useAuth.js           # 认证 hooks
    pages/
      Home.jsx                 # 广场（无限滚动，Phase 2 重写）
      Login.jsx                # 登录
      Register.jsx             # 注册
      Chat.jsx                 # 对话页（SSE + markdown + 三按钮）
      PostDetail.jsx           # 帖子详情（Phase 2 新增）
    components/
      Icons.jsx                # SVG 图标组件集（25个图标，替代 emoji）
      Navbar.jsx               # 导航栏
      PostCard.jsx             # 帖子卡片
      ShareModal.jsx           # 分享弹窗（Phase 2 三步模式）
      ConversationSidebar.jsx  # 对话侧边栏
      ActionButtons.jsx        # 三按钮
  index.html
  tailwind.config.js
  vite.config.js
  postcss.config.js
```

---

## UI 设计系统

基于 `frontend/ui-design.md` 和 `.design-context.md` 的完整设计规范。

**主题**：深色主题，葡萄紫品牌色
**主色**：OKLCH(0.52 0.22 280) — 矿物紫，非霓虹
**背景色**：OKLCH(0.12 0.008 290) — 深紫黑
**文字色**：OKLCH(0.80 0.008 290) — 暖白

**核心设计原则**：
- 深色基调 + 葡萄紫主色的社区空间
- 内容为光源，文字明亮，UI 克制
- 圆润亲和，非冷感深色
- 所有 UI 中 emoji 替换为 SVG 图标
- 所有颜色 OKLCH，零硬编码十六进制颜色

---

## API 端点一览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | ❌ |
| POST | `/api/auth/login` | 登录 | ❌ |
| POST | `/api/auth/refresh` | 刷新 token | ❌ |
| GET | `/api/conversations` | 已保存对话列表 | ✅ |
| POST | `/api/conversations` | 创建对话 | ✅ |
| GET | `/{id}/messages` | 获取消息 | ✅ |
| POST | `/{id}/messages` | 发送消息(SSE) | ✅ |
| POST | `/{id}/save` | 保存对话 | ✅ |
| DELETE | `/{id}` | 删除对话 | ✅ |
| GET | `/api/posts` | 帖子列表(分页) | ❌ |
| POST | `/api/posts` | 发布帖子 | ✅ |
| GET | `/api/posts/{id}` | 帖子详情 | ❌ |
| POST | `/api/posts/{id}/like` | 点赞/取消 | ✅ |
| GET | `/api/health` | 健康检查 | ❌ |

---

## 已知问题

1. **`SECRET_KEY` 仍是默认值** — 部署前必须改为随机字符串
2. **Turnstile** — 开发模式跳过，上线前需配置真实的 Turnstile site key
3. **Phase 3 评论未实现** — 帖子详情页的评论区还未做
4. **`claude-mems` MCP 已安装** — 重启后可恢复记忆
