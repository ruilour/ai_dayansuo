# AI答研所

> AI 给出答案，人来判断对错 — AI 回答的探讨与验证社区

**核心理念：** 用户提问 → AI 回答 → 用户存入/分享 → 广场展示 → 他人评论/点赞/讨论

---

## 功能概览

| 功能 | 状态 | 说明 |
|------|------|------|
|  **AI 对话** | ✅ | 流式 SSE 输出，支持 DeepSeek 深度思考 |
|  **对话管理** | ✅ | 新建/删除/保存对话，侧边栏列表 |
|  **分享帖子** | ✅ | AI 自动生成标题+摘要，发布到广场 |
|  **公共广场** | ✅ | 帖子卡片列表 + 详情页（Markdown 渲染） |
|  **分类系统** | ✅ | 帖子按分类筛选（技术/科学/生活/其他） |
|  **点赞** | ✅ | 每人每帖一次，实时计数 |
|  **评论系统** | ✅ | 一级评论 + 二级回复（楼中楼） |
|  **收藏** | ✅ | 个人主页收藏列表，取消收藏 |
|  **个人主页** | ✅ | 我的帖子、收藏、编辑资料 |
|  **通知** | ✅ | 评论/回复/点赞/收藏/系统处罚通知，已读未读 |
|  **防滥用** | ✅ | 5 层内容过滤 + 举报 + 封禁/禁言 |
|  **管理员后台** | ✅ | 统计面板、举报处理、用户管理、敏感词管理 |
|  **响应式** | ✅ | Tailwind 适配桌面和移动端 |

广场页面
<img width="1550" height="1167" alt="image" src="https://github.com/user-attachments/assets/7a8717c0-81aa-4159-8ee2-b2866b74dc65" />
<img width="1550" height="1167" alt="image" src="https://github.com/user-attachments/assets/c4a996b5-b8f4-4934-987b-e1a0c63b441b" />
<img width="1550" height="1167" alt="image" src="https://github.com/user-attachments/assets/7698c8e5-5505-4713-94b8-e3aebde8c645" />


个人首页
<img width="1550" height="1167" alt="image" src="https://github.com/user-attachments/assets/b6bb22ce-048e-414c-a7a4-4f436a703823" />


ai对话页面
<img width="1550" height="1167" alt="image" src="https://github.com/user-attachments/assets/39bdaa0e-2771-4cc3-aca0-42bfe3d710fb" />

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI + SQLAlchemy + MySQL |
| 认证 | JWT + bcrypt（无状态） |
| AI | DeepSeek API（流式 SSE） |
| 前端 | React + Vite + Tailwind CSS |
| 状态 | Zustand |
| 请求 | React Query |
| 限流 | slowapi |
| 验证码 | Cloudflare Turnstile |

---

## 启动

### 环境变量

复制 `backend/.env.example` 为 `backend/.env`，填入配置：

```env
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/ai_dayansuo
SECRET_KEY=your-secret-key
DEEPSEEK_API_KEY=your-deepseek-key
TURNSTILE_SITE_KEY=your-turnstile-site-key
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
```

### 后端

```bash
cd backend
pip install -r requirements.txt
python scripts/create_admin.py <用户名> <密码>   # 创建管理员
python -m uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

服务启动后：
- 前端：`http://localhost:5173`
- 后端 API：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`

---

## 数据库

10 张表，详见 [docs/database-schema.md](docs/database-schema.md)。

| 表 | 说明 |
|-----|------|
| `users` | 用户 + 角色/封禁状态 |
| `conversations` | AI 对话会话 |
| `messages` | 问答消息 |
| `posts` | 帖子（含隐藏标记） |
| `comments` | 评论 + 回复 |
| `post_likes` | 点赞 |
| `post_bookmarks` | 收藏 |
| `notifications` | 通知 |
| `reports` | 举报 |
| `blocked_words` | 敏感词库 |

---

## API 接口总览

### 用户认证
```
POST /api/auth/register      # 注册（需 Turnstile 验证码）
POST /api/auth/login         # 登录（失败 3 次后需 Turnstile）
```

### 对话
```
GET    /api/conversations           # 对话列表
POST   /api/conversations           # 新建对话
DELETE /api/conversations/{id}      # 删除对话
GET    /api/conversations/{id}/messages   # 消息列表
POST   /api/conversations/{id}/messages   # 发送消息（SSE 流式）
```

### 帖子
```
GET    /api/posts                   # 广场列表
POST   /api/posts                   # 发帖
GET    /api/posts/{id}              # 帖子详情
DELETE /api/posts/{id}              # 删帖
POST   /api/posts/{id}/like         # 点赞/取消
GET    /api/categories              # 分类列表（含帖子数）
```

### 评论
```
GET    /api/posts/{id}/comments     # 评论列表
POST   /api/posts/{id}/comments     # 发表评论
POST   /api/comments/{id}/replies   # 回复评论
DELETE /api/comments/{id}           # 删除评论
```

### 收藏
```
GET    /api/bookmarks               # 收藏列表
POST   /api/bookmarks               # 添加收藏
DELETE /api/bookmarks/{post_id}     # 取消收藏
```

### 个人主页
```
GET    /api/users/{id}/posts        # 用户的帖子
GET    /api/users/{id}/bookmarks    # 用户的收藏
PUT    /api/users/me                # 编辑个人资料
```

### 通知
```
GET    /api/notifications           # 通知列表
POST   /api/notifications/{id}/read # 标记已读
POST   /api/notifications/read-all  # 全部已读
GET    /api/notifications/unread-count  # 未读数
```

### 举报
```
POST   /api/reports                 # 提交举报
```

### 管理后台（需 admin/moderator 角色）
```
GET    /api/admin/stats             # 统计概览
GET    /api/admin/users             # 用户列表
PUT    /api/admin/users/{id}/status # 封禁/禁言/解封
GET    /api/admin/reports           # 举报列表
POST   /api/admin/reports/{id}/resolve  # 处理举报
GET    /api/admin/blocked-words     # 敏感词列表
POST   /api/admin/blocked-words     # 添加敏感词
DELETE /api/admin/blocked-words/{id}# 删除敏感词
```

### 其他
```
GET    /api/health                  # 健康检查
GET    /api/search?q=keyword        # 搜索帖子
```

---

## 防滥用系统

5 层内容安全过滤 + 管理员管控：

| 层级 | 措施 | 说明 |
|------|------|------|
| 1 | 空内容检查 | 拒绝空白标题/内容 |
| 2 | 敏感词匹配 | 从数据库 `blocked_words` 表动态加载 |
| 3 | HTML 净化 | 只允许安全的标签（nh3/bleach） |
| 4 | 重复检测 | 同一用户 5 分钟内相同内容 |
| 5 | AI 审核 | 调用 DeepSeek 判断是否违规 |

**补充机制：**
- Cloudflare Turnstile：注册必填 + 登录失败 3 次触发
- 举报系统：用户提交举报，3 人举报自动隐藏
- 封禁/禁言：到期自动恢复，处罚发送系统通知
- 限流：登录 5 次/15min，注册 3 次/h

---

## 项目结构

```
ai_dayansuo/
├── backend/
│   ├── app/
│   │   ├── main.py                 # 应用入口
│   │   ├── core/
│   │   │   ├── config.py           # 配置
│   │   │   ├── database.py         # 数据库连接
│   │   │   ├── security.py         # JWT + 封禁检查
│   │   │   └── limiter.py          # 限流
│   │   ├── models/                 # 10 个 ORM 模型
│   │   ├── schemas/                # Pydantic 校验
│   │   ├── routes/                 # API 路由
│   │   ├── services/
│   │   │   ├── ai_service.py       # DeepSeek 流式调用
│   │   │   ├── content_safety.py   # 5 层内容过滤
│   │   │   └── summarizer.py       # AI 摘要生成
│   │   └── utils/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/                  # 12 个页面
│   │   ├── components/             # 20+ 组件
│   │   ├── hooks/
│   │   ├── store/
│   │   └── api/
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   └── create_admin.py             # 管理员创建脚本
├── docs/
│   ├── database-schema.md
│   └── superpowers/
└── README.md
```

---

## 声明

**AI 出答案，人来定对错。** 这个产品的灵魂不是"又一个 AI 对话工具"，而是"AI 答案的检验场"。
