import os
import chromadb
from chromadb.config import Settings

CHROMA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "chroma_db")


class VectorStore:
    """ChromaDB 向量存储封装

    单例模式，所有模块共用同一 ChromaDB 客户端和 posts 集合。
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            self.client = chromadb.PersistentClient(
                path=CHROMA_DIR,
                settings=Settings(anonymized_telemetry=False),
            )
            self.collection = self.client.get_or_create_collection(
                name="posts",
                metadata={"hnsw:space": "cosine"},
            )
        except Exception:
            # ChromaDB 损坏，重建
            import shutil
            if os.path.exists(CHROMA_DIR):
                shutil.rmtree(CHROMA_DIR)
            self.client = chromadb.PersistentClient(
                path=CHROMA_DIR,
                settings=Settings(anonymized_telemetry=False),
            )
            self.collection = self.client.get_or_create_collection(
                name="posts",
                metadata={"hnsw:space": "cosine"},
            )

    def add_post(
        self,
        post_id: int,
        title: str,
        username: str,
        embedding: list[float],
        summary: str = "",
        content: str = "",
    ):
        """存入帖子向量"""
        self.collection.upsert(
            ids=[str(post_id)],
            embeddings=[embedding],
            metadatas=[{
                "post_id": post_id,
                "title": title[:200],
                "username": username[:50],
                "summary": summary[:500],
            }],
            documents=[(title + " " + summary)[:2000]],
        )

    def search(self, query_embedding: list[float], top_k: int = 5) -> list[dict]:
        """检索 Top-K 相关帖子"""
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, 20),
        )
        items = []
        if not results["ids"] or not results["ids"][0]:
            return items
        for i in range(len(results["ids"][0])):
            items.append({
                "post_id": int(results["ids"][0][i]),
                "title": results["metadatas"][0][i].get("title", ""),
                "username": results["metadatas"][0][i].get("username", ""),
                "summary": results["metadatas"][0][i].get("summary", ""),
                "distance": results["distances"][0][i] if results.get("distances") else 0,
            })
        return items

    def delete_post(self, post_id: int):
        """删帖时同步删除向量"""
        try:
            self.collection.delete(ids=[str(post_id)])
        except Exception:
            pass

    def count(self) -> int:
        """知识库帖子总数"""
        return self.collection.count()


async def rag_search(query_text: str, top_k: int = 5) -> list[dict]:
    """对外检索接口：query_text → 向量 → ChromaDB 检索

    调用方自行捕获异常。如果 EmbeddingService 返回 None（API 不可用等），
    直接返回空列表，保证降级安全。
    """
    from app.services.embedding_service import EmbeddingService
    embedding = await EmbeddingService.embed_text(query_text)
    if not embedding:
        return []
    store = VectorStore()
    return store.search(embedding, top_k)


def reindex_all_posts(db):
    """重建所有帖子索引（脚本用）

    遍历数据库中所有非隐藏帖子，用 EmbeddingService 生成向量并存入
    ChromaDB。使用 asyncio.run() 同步调用异步 Embedding API。

    Args:
        db: SQLAlchemy Session 对象
    Returns:
        int: 成功索引的帖子数量
    """
    from app.models.post import Post
    from app.services.embedding_service import EmbeddingService
    import asyncio
    posts = db.query(Post).filter(Post.is_hidden == False).all()
    store = VectorStore()
    count = 0
    for p in posts:
        text = f"{p.title} {p.summary or ''}"
        if not text.strip():
            continue
        try:
            embedding = asyncio.run(EmbeddingService.embed_text(text))
            if embedding:
                username = p.user.username if p.user else "unknown"
                store.add_post(p.id, p.title, username, embedding, p.summary or "")
                count += 1
        except Exception:
            continue
    return count
