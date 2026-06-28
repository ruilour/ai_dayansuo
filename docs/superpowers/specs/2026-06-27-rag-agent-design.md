# RAG 知识库问答 Agent 设计

> AI答研所 — 为 AI 对话注入社区知识，让回答有据可依

---

## 一、概述

给现有 AI 对话系统增加 RAG（Retrieval-Augmented Generation）能力：用户提问时，自动检索社区中相关的优质帖子，作为上下文注入 AI，让 AI 回答时引用已有知识，避免"每次都从零生成"。

---

## 二、架构

```
               ┌──────────────────────┐
               │      ChromaDB        │
               │  (向量数据库，余弦距离) │
               └──────┬───────────────┘
                      │ 检索 Top-K（距离<0.6）
   发帖 ──→ Embedding │
                      ▼
用户提问 ──→ 检索相关帖子 ──→ 注入 Prompt ──→ AI 带引用回答
```

两条核心流程：

### 2.1 索引流程（发帖时触发）

```
用户发帖 → 拼接标题+摘要 → 调用 Embedding API (SiliconFlow/BAAI)
         → 生成 1024 维向量 → 存入 ChromaDB（metadata: post_id, title, username, summary）
```

### 2.2 检索流程（对话时触发）

```
用户发送消息 → 触发策略判断（非闲聊/语气词/频率限制）
           → 问题转为向量 → ChromaDB 检索（取 top_k*3 候选按余弦距离过滤）
           → 距离 < 0.6 的结果拼入 system prompt
           → AI 生成带来源引用的回答 → 流式输出 citations 事件
```

---

## 三、组件设计

### 3.1 Embedding 服务

**文件：** `backend/app/services/embedding_service.py`

```python
class EmbeddingService:
    MODEL: 通过 settings.DEEPSEEK_EMBEDDING_MODEL 配置
    _cache: dict[str, list[float]]  # MD5 内存缓存

    async def embed_text(text: str) -> list[float] | None
    async def embed_batch(texts: list[str]) -> list[list[float] | None]
```

**关键实现细节：**

| 项 | 说明 |
|----|------|
| API 端点 | `DEEPSEEK_EMBEDDING_BASE_URL`（默认 `https://api.siliconflow.cn/v1/embeddings`） |
| 模型 | `DEEPSEEK_EMBEDDING_MODEL`（默认 `BAAI/bge-large-zh-v1.5`） |
| API Key | `DEEPSEEK_EMBEDDING_API_KEY`，留空则复用 `DEEPSEEK_API_KEY` |
| 超时 | 15 秒，超时/连接失败返回 `None`（降级） |
| 缓存 | MD5 文本 hash 做 key，避免相同文本重复调用 API |
| 截断 | 输入文本截断至 3000 字符 |
| 降级 | 任何异常返回 `None`，不阻塞上游调用 |

### 3.2 向量检索服务

**文件：** `backend/app/services/vector_store.py`

```python
class VectorStore:
    """ChromaDB 封装，单例模式"""

    CHROMA_DIR = "backend/chroma_db/"
    MIN_RELEVANCE_DISTANCE = 0.6  # 余弦距离阈值

    def add_post(post_id, title, username, embedding, summary)
    def search(query_embedding, top_k=5) -> list[dict]
    def delete_post(post_id)
    def count() -> int
```

**关键实现细节：**

| 项 | 说明 |
|----|------|
| 存储引擎 | ChromaDB `PersistentClient`，持久化到 `backend/chroma_db/` |
| 距离度量 | `cosine`（hnsw:space=cosine），0=完全相同，2=完全相反 |
| 相关性阈值 | `MIN_RELEVANCE_DISTANCE=0.6`，高于此值的结果跳过 |
| 检索策略 | 取 `top_k * 3`（最多 50）候选项，再按距离过滤 |
| 损坏恢复 | 初始化异常时自动删除 `chroma_db/` 目录重建空库 |
| Content | 存入 `title + " " + summary` (截断 2000 字符) |

**对外接口：**

```python
async def rag_search(query_text: str, top_k: int = 5) -> list[dict]
"""检索 → 返回 [{post_id, title, username, summary, distance}]"""

def reindex_all_posts(db) -> int
"""遍历所有非隐藏帖子，建立向量索引（内部使用 asyncio.run）"""
```

### 3.3 Prompt 注入

**文件：** `backend/app/services/ai_service.py`

检索到的帖子以 XML 格式拼入 system prompt：

```xml
<context>
  <source post_id="1" username="张三" title="Python异步编程入门">
    Python异步编程入门...
  </source>
  <source post_id="5" username="李四" title="FastAPI最佳实践">
    FastAPI最佳实践...
  </source>
</context>
```

AI 被要求优先基于 context 中的内容回答。回答流结束后，后端发送 `citations` 事件：
```json
{"type": "citations", "content": [{"post_id": 1, "title": "...", "username": "..."}]}
```

### 3.4 触发策略

不是每条消息都触发 RAG 检索：

| 触发条件 | 行为 |
|----------|------|
| 对话首条消息 | 触发检索 |
| 消息长度 ≥ 5 字 | 触发检索 |
| 消息长度 < 5 字（如"继续""然后呢"） | 跳过 |
| 消息为纯语气词（"好的""谢谢"） | 跳过 |
| 同对话 5 条消息内已检索过 | 跳过（缓存 bucket） |
| Embedding API 不可用 | 跳过，正常对话 |

---

## 四、配置项

```env
# .env 配置
DEEPSEEK_EMBEDDING_API_KEY=          # 留空则复用 DEEPSEEK_API_KEY
DEEPSEEK_EMBEDDING_BASE_URL=          # 默认 https://api.siliconflow.cn/v1/embeddings
DEEPSEEK_EMBEDDING_MODEL=             # 默认 BAAI/bge-large-zh-v1.5
```

---

## 五、文件改动清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `backend/app/services/embedding_service.py` | Embedding 服务（SiliconFlow API） |
| 新增 | `backend/app/services/vector_store.py` | ChromaDB 向量存储 + 相关性阈值过滤 |
| 修改 | `backend/app/services/ai_service.py` | RAG 检索 + Prompt 注入 + citations 事件 |
| 修改 | `backend/app/routes/posts.py` | 发帖同步索引 + 删帖删除向量 |
| 新增 | `backend/requirements.txt` | 添加 chromadb 依赖 |
| 新增 | `scripts/reindex_posts.py` | 存量帖子重建索引脚本 |
| 新增 | `frontend/src/components/CitationBadge.jsx` | 引用来源标签组件 |
| 修改 | 前端对话页面 | SSE 处理 citations 事件并展示引用 |

---

## 六、引用展示（前端）

AI 回答底部显示引用来源标签，使用 `CitationBadge` 组件：

- 蓝色圆角标签，显示帖子标题 + 作者
- 可点击跳转到 `/post/{id}` 帖子详情页
- 流式输出完成后才展示（citations 事件在 done 之前发送）
- 下一轮对话自动清除上一轮的引用

---

## 七、边界情况

| 场景 | 处理 |
|------|------|
| 知识库为空（新社区） | `rag_search` 返回 `[]`，跳过 RAG |
| 检索结果为 0 | 同上 |
| 所有结果距离 > 0.6 | 同上（距离阈值过滤后为空） |
| Embedding API 超时/报错 | 返回 `None`，`rag_search` 返回 `[]`，正常对话 |
| 无 API Key 配置 | 日志警告，返回 `None`，不阻塞 |
| ChromaDB 损坏 | `__init__` 捕获异常，`rmtree` 重建空库 |
| 帖子被删除 | 路由中同步调用 `VectorStore.delete_post()` |
| 帖子内容过长 | Embedding 截断前 3000 字符，ChromaDB document 截断 2000 字符 |
| Token 刷新 | 前端 api/index.js 拦截器自动刷新并重放请求 |
