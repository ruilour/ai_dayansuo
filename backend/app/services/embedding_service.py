import hashlib
import httpx
from app.core.config import settings


class EmbeddingService:
    """文本嵌入服务

    架构：
      1. 优先调用 Embedding API（OpenAI 兼容，可配置）
      2. API 不可用时降级为本地哈希向量（开发/测试用）

    默认 API：SiliconFlow (BAAI/bge-zh-v1.5)，也可通过 settings 切换为任意
    OpenAI 兼容的 Embedding 端点。

    API 配置方式（.env）：
      DEEPSEEK_EMBEDDING_BASE_URL = "https://api.siliconflow.cn/v1/embeddings"
      DEEPSEEK_EMBEDDING_MODEL    = "BAAI/bge-zh-v1.5"
      DEEPSEEK_EMBEDDING_API_KEY  = ""  # 留空则复用 DEEPSEEK_API_KEY
    """

    VECTOR_DIM = 384  # ChromaDB 默认维度
    _cache: dict[str, list[float]] = {}  # 内存缓存，key=文本hash

    # ------------------------------------------------------------------
    # 公有接口
    # ------------------------------------------------------------------

    @classmethod
    async def embed_text(cls, text: str) -> list[float]:
        """单文本向量化"""
        text = text.strip()[:3000]
        if not text:
            return [0.0] * cls.VECTOR_DIM

        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        emb = await cls._try_api(text) or cls._local_embed(text)
        cls._cache[cache_key] = emb
        return emb

    @classmethod
    async def embed_batch(cls, texts: list[str], batch_size: int = 10) -> list[list[float]]:
        """批量向量化"""
        results: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            for t in batch:
                results.append(await cls.embed_text(t))
        return results

    # ------------------------------------------------------------------
    # API 方式
    # ------------------------------------------------------------------

    @classmethod
    async def _try_api(cls, text: str) -> list[float] | None:
        """调用外部 Embedding API，失败返回 None"""
        api_key = settings.DEEPSEEK_EMBEDDING_API_KEY or settings.DEEPSEEK_API_KEY
        if not api_key:
            return None

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    settings.DEEPSEEK_EMBEDDING_BASE_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": settings.DEEPSEEK_EMBEDDING_MODEL,
                        "input": text,
                    },
                )
                if resp.status_code != 200:
                    return None
                data = resp.json()
                return data["data"][0]["embedding"]
        except Exception:
            return None

    # ------------------------------------------------------------------
    # 本地哈希向量（开发降级）
    # ------------------------------------------------------------------

    @classmethod
    def _local_embed(cls, text: str) -> list[float]:
        """基于字符 n-gram 的确定性向量（随机傅里叶特征近似）

        每个 n-gram 通过伪随机 LCG 生成一整条向量，所有 n-gram 累加后 L2 归一化。
        相似文本共享更多 n-gram，因此向量更接近。
        无需任何外部依赖。
        """
        lowered = text.strip().lower()
        vec = [0.0] * cls.VECTOR_DIM

        # 收集唯一 n-gram
        ng_set: set[str] = set()
        for n in (1, 2, 3):
            for i in range(len(lowered) - n + 1):
                ng_set.add(lowered[i:i + n])

        if not ng_set:
            return vec

        for gram in ng_set:
            # 用 hash 种子初始化 LCG
            seed = int.from_bytes(hashlib.sha256(gram.encode()).digest()[:8], "big")
            rng = seed
            for d in range(cls.VECTOR_DIM):
                rng = (rng * 1103515245 + 12345) & 0x7FFFFFFF
                vec[d] += (rng / 0x40000000) - 1.0  # [-1, 1]

        # L2 归一化
        norm = sum(v * v for v in vec) ** 0.5
        return [v / norm for v in vec] if norm > 0 else vec
