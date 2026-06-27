import hashlib
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """文本嵌入服务

    架构：
      1. 调用外部 Embedding API（OpenAI 兼容，可配置）
      2. 失败时返回 None，由上游（VectorStore）处理降级

    默认 API：SiliconFlow (BAAI/bge-zh-v1.5)，也可通过 settings 切换为任意
    OpenAI 兼容的 Embedding 端点。

    API 配置方式（.env）：
      DEEPSEEK_EMBEDDING_BASE_URL = "https://api.siliconflow.cn/v1/embeddings"
      DEEPSEEK_EMBEDDING_MODEL    = "BAAI/bge-zh-v1.5"
      DEEPSEEK_EMBEDDING_API_KEY  = ""  # 留空则复用 DEEPSEEK_API_KEY
    """

    _vector_dim: int | None = None  # 从 API 首次成功调用获取，用于下游校验
    _cache: dict[str, list[float]] = {}  # 内存缓存，key=文本hash

    # ------------------------------------------------------------------
    # 公有接口
    # ------------------------------------------------------------------

    @classmethod
    async def embed_text(cls, text: str) -> list[float] | None:
        """单文本向量化，失败返回 None"""
        text = text.strip()[:3000]
        if not text:
            return None

        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        emb = await cls._try_api(text)
        if emb is None:
            return None

        cls._cache[cache_key] = emb
        return emb

    @classmethod
    async def embed_batch(
        cls, texts: list[str], batch_size: int = 10
    ) -> list[list[float] | None]:
        """批量向量化"""
        results: list[list[float] | None] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            for t in batch:
                results.append(await cls.embed_text(t))
        return results

    # ------------------------------------------------------------------
    # API 调用
    # ------------------------------------------------------------------

    @classmethod
    async def _try_api(cls, text: str) -> list[float] | None:
        """调用外部 Embedding API，失败返回 None"""
        api_key = settings.DEEPSEEK_EMBEDDING_API_KEY or settings.DEEPSEEK_API_KEY
        if not api_key:
            logger.warning(
                "No embedding API key configured — set DEEPSEEK_EMBEDDING_API_KEY "
                "or DEEPSEEK_API_KEY in .env"
            )
            return None

        # 当使用 DEEPSEEK_API_KEY 但 endpoint 指向非 DeepSeek 服务时发出警告
        if not settings.DEEPSEEK_EMBEDDING_API_KEY and settings.DEEPSEEK_API_KEY:
            if "deepseek.com" not in settings.DEEPSEEK_EMBEDDING_BASE_URL.lower():
                logger.warning(
                    "Using DEEPSEEK_API_KEY with non-DeepSeek endpoint %s — "
                    "the key may be rejected",
                    settings.DEEPSEEK_EMBEDDING_BASE_URL,
                )

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
                    logger.warning(
                        "Embedding API returned status %d: %s",
                        resp.status_code,
                        resp.text[:200],
                    )
                    return None
                data = resp.json()
                emb: list[float] = data["data"][0]["embedding"]

                # 缓存向量维度
                if cls._vector_dim is None:
                    cls._vector_dim = len(emb)
                    logger.info(
                        "Embedding dimension detected: %d", cls._vector_dim
                    )

                return emb
        except httpx.ConnectError:
            logger.warning("Embedding API unreachable (connection error)")
            return None
        except httpx.TimeoutException:
            logger.warning("Embedding API request timed out")
            return None
        except Exception:
            logger.warning(
                "Unexpected error calling Embedding API", exc_info=True
            )
            return None
