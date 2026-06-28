# AI答研所 — 技术栈与面试指南

> 简历包装用文档。5 个技术维度，每个维度包含：**技术栈表** → **用来干啥** → **核心技术点** → **面试话术**

---

## 维度一：AI / RAG 知识库系统

| 技术 | 用途 | 简历关键词 |
|------|------|-----------|
| RAG (检索增强生成) | 让 AI 参考社区帖子回答 | Retrieval-Augmented Generation |
| Embedding API | 文本→向量 (1024维) | Semantic embedding / vectorization |
| ChromaDB | 向量数据库，余弦距离检索 | Vector database, cosine similarity |
| BAAI/bge-large-zh-v1.5 | 中文 Embedding 模型 | Chinese text embedding model |
| SiliconFlow API | Embedding 服务端 | OpenAI-compatible embedding endpoint |
| SSE 流式传输 | AI 回答逐字推送 | Server-Sent Events streaming |
| DeepSeek API | LLM 对话 + 内容审核 | LLM integration, AI moderation |

### 用来干啥
用户提问时自动检索 ChromaDB 中相关社区帖子，注入 AI prompt 作为参考上下文，回答末尾标注来源引用。

### 核心技术点
1. **RAG 两阶段**：先检索后生成。检索模块从 ChromaDB 取 top_k×3 候选→按余弦距离 0.6 阈值过滤→最终取 top_k；生成模块将结果以 XML `<context>` 格式注入 system prompt。
2. **Embedding 容错架构**：`EmbeddingService.embed_text()` 返回 `list[float] | None`，任何异常（超时/连接失败/API 报错）都返回 None。上游 `rag_search()` 收到 None 自动返回空列表，对话降级为纯 LLM 模式。**故障域隔离，不 cascading failure。**
3. **向量索引生命周期管理**：发帖 → PostgreSQL commit → try `embedding + upsert`；删帖 → try `collection.delete()`；存量帖子 `scripts/reindex_posts.py`。写操作与索引操作异步解耦。

### 面试话术
> 我设计了一个完整的 RAG 流程：用户提问 → embedding 向量化 → ChromaDB 检索 → 余弦距离 0.6 阈值过滤 → 注入 AI prompt → 流式回答 + 来源引用。Embedding API 异常时自动降级为正常对话，发帖时异步建索引、删帖时同步删向量，保证数据一致性，索引异常不阻塞核心流程。

---

## 维度二：后端架构

| 技术 | 用途 | 简历关键词 |
|------|------|-----------|
| FastAPI | REST API 框架 | Async Python web framework |
| Pydantic v2 | 请求/响应数据校验 | Data validation & serialization |
| SQLAlchemy 2.0 | ORM，10 张 MySQL 表 | SQLAlchemy ORM |
| python-jose | JWT 签发与验证 | JWT authentication |
| passlib[bcrypt] | 密码哈希 | bcrypt password hashing |
| httpx | 异步 HTTP 调用 AI API | Async HTTP client |
| slowapi | API 限流 | Rate limiting middleware |
| uvicorn | ASGI 服务器 | ASGI server |

### 用来干啥
提供 RESTful API 接口：用户认证、对话管理、帖子 CRUD、评论/点赞/收藏、通知、搜索、管理后台。

### 核心技术点
1. **JWT 双 token + 前端刷新队列**：access_token（24h）+ refresh_token（7d）。Axios 响应拦截器捕获 401 → 自动用 refresh_token 换新 → 重放原请求。`failedQueue` 模式确保 N 个并发 401 只触发 1 次 refresh，其余排队等结果，避免 refresh 风暴。
2. **FastAPI Depends 权限链**：多层守卫函数通过 `Depends()` 链式组合。`get_current_user`（强制登录）、`get_current_user_optional`（未登录可访问）、`check_not_muted()`（禁言阻断）、`require_admin()`（角色校验）。路由函数的类型签名直接声明前置条件。
3. **Service + Repository 分层**：Routes（HTTP 语义）→ Services（业务逻辑）→ Models（ORM + 数据访问）。`ai_service.py` 负责 AI 对话与 RAG 注入，`content_safety.py` 负责 5 层过滤，`embedding_service.py` 负责向量化，`vector_store.py` 负责 ChromaDB 操作。

### 面试话术
> 我用 FastAPI Depends 链式注入组织权限层——每个路由参数列表就能看清需要什么前置条件，不用翻装饰器或中间件代码。JWT 自动刷新用请求队列解决并发 401 竞态问题，生产环境跑下来没出现过 token 刷新失败导致用户掉线的情况。

---

## 维度三：前端开发

| 技术 | 用途 | 简历关键词 |
|------|------|-----------|
| React 19 | UI 框架 | Functional components, Hooks |
| Vite 8 | 构建与开发服务器 | Build tool, HMR |
| Tailwind CSS 3 | 样式框架 | Utility-first CSS, dark mode |
| Zustand | 全局状态管理 | Lightweight state management |
| TanStack Query v5 | 服务端状态/缓存 | Server state management |
| React Router v7 | SPA 路由 | Client-side routing |
| Axios | HTTP 客户端 + 拦截器 | HTTP interceptor, auto token refresh |
| react-markdown | Markdown 渲染 | Markdown rendering, GFM, sanitize |

### 用来干啥
AI 对话界面（流式渲染）、帖子广场、详情页（Markdown 渲染）、个人主页、管理后台、通知下拉面板。

### 核心技术点
1. **SSE 流式渲染**：`fetch()` + `ReadableStream` 逐行读取 SSE 事件，事件类型包括 `reasoning`（思考过程）、`content`（回答正文）、`citations`（引用来源）、`done`（结束）、`error`（错误）。流结束后统一渲染，不是逐字 append DOM。
2. **axios 拦截器实现无感 Token 续期**：`response.interceptors` 捕获 401 → 存入 `failedQueue` → 单次 refresh → resolve 全部排队请求 → 重放原始请求。同时 `localStorage` 中 user 信息随 token 同步刷新。
3. **Zustand + TanStack Query 分工**：Zustand 管理客户端状态（当前对话、UI 状态、token），TanStack Query 管理服务端状态（帖子列表、通知列表、用户数据），避免状态混淆。

### 面试话术
> 前端状态管理做了清晰分层——Zustand 只存客户端状态（当前对话、UI 开关），服务端数据全部走 TanStack Query 的缓存和失效机制。SSE 流式渲染在数据收齐后统一渲染 DOM，不是逐字 append，避免频繁 reflow。

---

## 维度四：安全与防滥用

| 技术 | 用途 | 简历关键词 |
|------|------|-----------|
| Cloudflare Turnstile | 人机验证 | Privacy-first CAPTCHA |
| slowapi 梯度限流 | API 频率控制 | Rate limiting |
| nh3 库 | HTML 标签净化 | HTML sanitization |
| 正则敏感词引擎 | 自定义违规词过滤 | Profanity filter / pattern matching |
| AI 内容审核 | 调用 LLM 判断违规 | AI-powered content moderation |
| bcrypt | 密码哈希存储 | Password hashing algorithm |

### 用来干啥
5 层内容安全过滤 + 举报 + 封禁/禁言 + 限流 + 验证码，多重防线防止垃圾内容和恶意用户。

### 核心技术点
1. **5 层内容安全管道**：`空内容校验 → 敏感词匹配（DB 动态加载+正则） → HTML 净化（nh3） → 重复检测（同用户 5min 窗口） → AI 审核（DeepSeek 判断）`。每层独立可插拔，从轻到重逐级拦截。前 3 层零/低成本拦截 ≥ 90% 违规内容。
2. **举报 + 3 人自动隐藏 + 处理通知**：`reports` 表记录 → 同一 target pending 数 ≥ 3 自动 `is_hidden=True` → 管理员处理后 `create_notification` 通知举报人和被处罚人。处理动作支持 `none/warning/mute/ban`。
3. **封禁/禁言到期自动恢复**：`muted_until`/`banned_until` 存入 UTC datetime。每次请求前 `check_not_muted()` 检查，超期自动重置为 active。统一 `datetime.utcnow()` 避免时区 `TypeError`。

### 面试话术
> 5 层管道从轻到重逐级拦截——前两层零成本（空检查 + 敏感词），中间两层轻量计算（HTML 净化 + 重复检测），最后才调 AI。90% 垃圾内容在前三层就拦住了，AI 审核只处理边界情况，既省 API 成本又保证用户体验。封禁到期自动恢复不需要管理员手动解封。

---

## 维度五：数据库与存储

| 技术 | 用途 | 简历关键词 |
|------|------|-----------|
| MySQL | 关系型主数据库 | MySQL, 10 tables |
| SQLAlchemy 2.0 | ORM + 迁移 | ORM with relationship mapping |
| ChromaDB | 向量数据库（本地持久化） | Vector database, local persistence |
| Pydantic schemas | 数据校验与序列化 | Request/response validation |
| Index 优化 | 外键 + 唯一约束 + 查询索引 | Database indexing strategy |

### 用来干啥
MySQL 存业务数据（用户/对话/帖子/评论/通知等 10 表），ChromaDB 存帖子向量用于语义检索。

### 核心技术点
1. **10 表关系设计**：`users → conversations → messages`（1:N cascade）、`conversations → posts`（1:1）、`posts → comments → post_likes → post_bookmarks`（1:N cascade）、`notifications`（双 FK 关联 user_id 和 actor_id）、`reports`（多态 target_type+target_id）、`blocked_words`（独立表）。
2. **向量 + 关系混合存储**：MySQL 存业务数据保证 ACID 事务，ChromaDB 存向量保证相似度检索性能。两者通过 `post_id` 关联。发帖/删帖时通过 try/catch 同步两边的状态，异常不回滚主库。
3. **ChromaDB 损坏自愈**：初始化 `PersistentClient` 失败 → 自动 `shutil.rmtree` 删除 `chroma_db/` 目录 → 重建空集合。生产环境重启即可恢复。

### 面试话术
> 混合存储架构——MySQL 管业务事务，ChromaDB 管向量检索，两者通过 post_id 关联。ChromaDB 损坏时自动重建空库保证服务可用性，向量数据可以通过 reindex 脚本从 MySQL 恢复。

---

## 附：简历一句话版本

> **AI 答案探讨社区 — 用户与 AI 对话后将优质回答发布为帖子供社区讨论验证。包含 RAG 知识库（ChromaDB + Embedding）、JWT 双 token 认证、RBAC 权限、5 层内容安全过滤、举报自动隐藏、SSE 流式对话等完整功能。**
