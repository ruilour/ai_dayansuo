## 「AI答研所」— 完整项目需求文档


### 一、项目概述

**项目名称**：AI答研所

**包名**：`ai_dayansuo`

**数据库名**：`ai_dayansuo`

**一句话定位**：AI 回答的探讨与验证社区。

**核心理念**：AI 给出答案，人来判断对错。


### 二、核心机制

```
用户提问 → AI 回答 → 用户存入/分享 → 广场展示 → 他人评论/点赞/讨论
```

**三层价值**：

| 层级 | 价值 |
|------|------|
| 第一层 | 用户获得 AI 回答（私有用） |
| 第二层 | 用户分享回答（公共化） |
| 第三层 | 他人审视、讨论、验证（社区化） |


### 三、用户系统（极简）

| 用户类型 | 权限 |
|---------|------|
| 自己（登录用户） | 注册/登录、私有对话、分享、删自己的帖子/评论 |
| 他人（未登录/其他用户） | 浏览广场、点赞、一级评论、二级评论 |

**不需要**：关注/粉丝、私信/通知、个人主页、收藏。

**用户表**：
```sql
users:
  id, username, password_hash, avatar, created_at
```


### 四、核心交互：每轮回答后的三个按钮

AI 回答结束后，显示三个按钮：

| 按钮 | 行为 | 保存？ | 后续状态 |
|------|------|--------|---------|
| 💾 **存入** | 保存对话到私有库 | ✅ 保存 | 弹出分享弹窗（见第五章） |
| 💬 **继续聊** | 不保存，继续当前会话 | ❌ 不保存 | 回到输入框，placeholder 变警告 |
| 📂 **新话题** | 不保存，结束当前会话 | ❌ 不保存 | 清空会话，placeholder 恢复 |

**按钮默认状态**：「继续聊」默认高亮，按 Enter 触发。


### 五、输入框 Placeholder 动态提示

| 会话状态 | Placeholder 文字 |
|---------|-----------------|
| 新建会话（干净） | `💬 你想问什么？` |
| 未保存（1轮） | `⚠️ 当前对话未保存，继续问 AI 可能会忘记前文` |
| 未保存（N轮） | `⚠️ 有 N 轮未保存，AI 可能已遗忘部分内容` |
| 已保存 | `💬 继续提问，AI 会记住上下文` |
| 已分享 | `✅ 已保存，可随时分享到广场` |


### 六、分享功能

**触发**：用户点击「存入」后，自动弹出分享弹窗。

**弹窗**：
```
✅ 已存入你的档案

标题：[AI自动生成]
摘要：[AI自动生成，50-100字]

[ 📢 发到广场 ]  [ 🔒 仅自己可见 ]
```

**分享内容**：
- 标题：AI 生成（≤30字）
- 摘要：AI 生成（50-100字）
- 完整对话：所有用户问题 + AI 回答
- 发布者：用户名
- 发布时间、点赞数、评论数


### 七、公共广场

**排序**：按发布时间倒序（最新在前）

**帖子卡片**：标题、摘要、发布者、时间、点赞数、评论数

**帖子详情页**：完整 AI 回答（Markdown 渲染）、点赞按钮、评论区


### 八、评论系统

- 一级评论：直接对帖子评论
- 二级评论：对一级评论的回复（楼中楼）
- 排序：按时间正序


### 九、搜索

**范围**：帖子标题、摘要

**结果**：按相关度/时间排序


### 十、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 后端 | FastAPI | Python 异步框架 |
| 数据库 | MySQL | SQLAlchemy ORM |
| 认证 | JWT + bcrypt | 无状态认证 |
| AI | DeepSeek API | 复用现有代码 |
| 前端 | React + Vite + Tailwind | 前后端分离 |
| 状态管理 | Zustand | 轻量 |
| API请求 | React Query | 缓存 |

**后端依赖**：
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
sqlalchemy==2.0.36
pymysql==1.1.1
python-dotenv==1.0.0
httpx==0.28.1
```


### 十一、数据库设计（MySQL）

```sql
CREATE DATABASE ai_dayansuo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 对话表
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

-- 消息表
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    role ENUM('user', 'assistant') NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 帖子表
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    conversation_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    full_content TEXT NOT NULL,
    likes_count INT DEFAULT 0,
    comments_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 评论表
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

-- 点赞表
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


### 十二、API 接口

**用户**：
```
POST /api/auth/register
POST /api/auth/login
```

**对话**：
```
GET    /api/conversations
POST   /api/conversations
DELETE /api/conversations/{id}
GET    /api/conversations/{id}/messages
POST   /api/conversations/{id}/messages   # SSE 流式
```

**帖子**：
```
GET    /api/posts
POST   /api/posts
GET    /api/posts/{id}
DELETE /api/posts/{id}
POST   /api/posts/{id}/like
```

**评论**：
```
GET    /api/posts/{id}/comments
POST   /api/posts/{id}/comments
POST   /api/comments/{id}/replies
DELETE /api/comments/{id}
```

**搜索**：
```
GET    /api/search?q={keyword}
```


### 十三、项目目录结构

```
ai_dayansuo/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
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
│   │   │   ├── ai_service.py
│   │   │   ├── summarizer.py
│   │   │   └── conversation_service.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── logger.py
│   ├── requirements.txt
│   ├── .env
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── PostDetail.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── PostCard.jsx
│   │   │   ├── CommentList.jsx
│   │   │   ├── ShareModal.jsx
│   │   │   ├── ActionButtons.jsx
│   │   │   └── ConversationSidebar.jsx
│   │   ├── api/
│   │   │   └── index.js
│   │   ├── store/
│   │   │   └── useStore.js
│   │   └── hooks/
│   │       └── useAuth.js
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── uploads/
├── README.md
└── .gitignore
```




### 十四、开发阶段

**Phase 1（优先）**：用户 + 对话 + 三个按钮
- [ ] 用户注册/登录
- [ ] 对话 CRUD
- [ ] 流式 AI 对话
- [ ] 三个按钮交互
- [ ] Placeholder 动态提示

**Phase 2（核心）**：分享 + 广场
- [ ] AI 摘要生成
- [ ] 分享弹窗
- [ ] 帖子发布
- [ ] 广场列表
- [ ] 帖子详情

**Phase 3（社交）**：评论 + 点赞
- [ ] 一级评论
- [ ] 二级评论
- [ ] 帖子点赞

**Phase 4（增强）**：搜索 + 优化
- [ ] 搜索帖子
- [ ] 响应式适配


### 十五、验收标准

- [ ] 用户注册/登录正常
- [ ] AI 流式输出正常
- [ ] 三个按钮交互符合设计
- [ ] Placeholder 动态提示正确
- [ ] 保存到库成功
- [ ] 分享弹窗正常，摘要生成
- [ ] 帖子出现在广场
- [ ] 评论功能正常
- [ ] 点赞功能正常
- [ ] 搜索正常


### 十六、启动命令

**后端**：
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**前端**：
```bash
cd frontend
npm install
npm run dev
```


### 十七、文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | AI答研所 |
| 包名 | `ai_dayansuo` |
| 数据库名 | `ai_dayansuo` |
| 版本 | v1.0 |
| 技术栈 | FastAPI + MySQL + React + Tailwind |


### 十八、核心原则（给开发者）

> **AI 出答案，人来定对错。**

这个产品的灵魂不是“又一个 AI 对话工具”，而是“AI 答案的检验场”。