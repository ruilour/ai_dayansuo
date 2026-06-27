"""Tests for EmbeddingService

Tests cover:
1. Empty text returns None
2. When API is unreachable, returns None (mock httpx to raise ConnectError)
3. Successful API call returns embedding (mock httpx to return a valid response)
4. Cache returns same result for same text
5. embed_batch returns list of results
"""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.services.embedding_service import EmbeddingService


class TestEmbeddingService:
    """Test suite for EmbeddingService"""

    # ------------------------------------------------------------------
    # Fixtures
    # ------------------------------------------------------------------

    @pytest.fixture(autouse=True)
    def reset_class_state(self):
        """Reset class-level state before each test to avoid cross-test pollution"""
        EmbeddingService._cache.clear()
        EmbeddingService._vector_dim = None
        yield

    @pytest.fixture
    def mock_settings(self):
        """Fixture providing a mock settings object with embedding config"""
        with patch("app.services.embedding_service.settings") as mock:
            mock.DEEPSEEK_EMBEDDING_API_KEY = "test-key-123"
            mock.DEEPSEEK_API_KEY = ""
            mock.DEEPSEEK_EMBEDDING_BASE_URL = (
                "https://api.siliconflow.cn/v1/embeddings"
            )
            mock.DEEPSEEK_EMBEDDING_MODEL = "BAAI/bge-zh-v1.5"
            yield mock

    @pytest.fixture
    def mock_api_success(self, mock_settings):
        """Fixture that makes the API return a valid embedding response"""

        def _make_response(dim: int = 4) -> MagicMock:
            mock_response = MagicMock(spec=httpx.Response)
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "data": [{"embedding": [float(i) / dim for i in range(dim)]}]
            }
            return mock_response

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = _make_response()
            yield mock_post

    @pytest.fixture
    def mock_api_connect_error(self, mock_settings):
        """Fixture that makes the API raise ConnectError"""
        with patch(
            "httpx.AsyncClient.post",
            side_effect=httpx.ConnectError("Connection refused"),
        ):
            yield

    # ------------------------------------------------------------------
    # Test 1: Empty text returns None
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_empty_text_returns_none(self):
        """Empty text (or whitespace-only) should return None"""
        assert await EmbeddingService.embed_text("") is None
        assert await EmbeddingService.embed_text("   ") is None
        assert await EmbeddingService.embed_text("\t\n") is None

    # ------------------------------------------------------------------
    # Test 2: API unreachable returns None
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_api_connect_error_returns_none(self, mock_api_connect_error):
        """When httpx raises ConnectError, embed_text returns None"""
        result = await EmbeddingService.embed_text("test text")
        assert result is None

    @pytest.mark.asyncio
    async def test_api_timeout_returns_none(self, mock_settings):
        """When httpx raises TimeoutException, embed_text returns None"""
        with patch(
            "httpx.AsyncClient.post",
            side_effect=httpx.TimeoutException("Request timed out"),
        ):
            result = await EmbeddingService.embed_text("test text")
            assert result is None

    # ------------------------------------------------------------------
    # Test 3: Successful API call returns embedding
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_successful_api_returns_embedding(self, mock_api_success):
        """Successful API response should return the embedding vector"""
        result = await EmbeddingService.embed_text("test text")
        assert result is not None
        assert isinstance(result, list)
        assert all(isinstance(v, float) for v in result)

    @pytest.mark.asyncio
    async def test_api_non_200_returns_none(self, mock_settings):
        """Non-200 HTTP status should return None"""
        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 401
        mock_response.text = "Unauthorized"

        with patch(
            "httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_response
        ):
            result = await EmbeddingService.embed_text("test text")
            assert result is None

    @pytest.mark.asyncio
    async def test_no_api_key_returns_none(self):
        """When no API key is configured at all, return None"""
        with patch("app.services.embedding_service.settings") as mock:
            mock.DEEPSEEK_EMBEDDING_API_KEY = ""
            mock.DEEPSEEK_API_KEY = ""
            result = await EmbeddingService.embed_text("test text")
            assert result is None

    @pytest.mark.asyncio
    async def test_different_texts_different_embeddings(self, mock_api_success):
        """Different texts should (generally) produce different embeddings"""
        # Override fixture to return different embeddings per call
        embeddings = iter([[0.1, 0.2], [0.3, 0.4]])

        async def side_effect(*args, **kwargs):
            return next(embeddings)

        with patch.object(
            EmbeddingService, "_try_api", side_effect=side_effect
        ):
            a = await EmbeddingService.embed_text("hello")
            b = await EmbeddingService.embed_text("world")
            assert a != b

    # ------------------------------------------------------------------
    # Test 4: Cache returns same result for same text
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_cache_returns_same_result(self, mock_api_success):
        """Cache should return identical result without calling API again"""
        result1 = await EmbeddingService.embed_text("same text")
        # Second call should hit cache, not API
        result2 = await EmbeddingService.embed_text("same text")

        assert result1 == result2
        # The mock was set up in mock_api_success — only called once
        assert mock_api_success.call_count == 1

    @pytest.mark.asyncio
    async def test_cache_different_texts(self):
        """Different texts should have independent cache entries"""
        mock_results = {"text a": [0.1, 0.2], "text b": [0.3, 0.4]}

        with patch.object(
            EmbeddingService,
            "_try_api",
            side_effect=lambda text: mock_results.get(text),
        ):
            a = await EmbeddingService.embed_text("text a")
            b = await EmbeddingService.embed_text("text b")
            assert a == [0.1, 0.2]
            assert b == [0.3, 0.4]

    # ------------------------------------------------------------------
    # Test 5: embed_batch returns list of results
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_embed_batch_returns_list(self):
        """embed_batch should return a list of results in order"""
        mock_results = {"a": [0.1], "b": [0.2], "c": [0.3]}

        with patch.object(
            EmbeddingService,
            "_try_api",
            side_effect=lambda text: mock_results.get(text),
        ):
            results = await EmbeddingService.embed_batch(["a", "b", "c"])
            assert len(results) == 3
            assert results[0] == [0.1]
            assert results[1] == [0.2]
            assert results[2] == [0.3]

    @pytest.mark.asyncio
    async def test_embed_batch_empty(self):
        """embed_batch with empty input returns empty list"""
        results = await EmbeddingService.embed_batch([])
        assert results == []

    @pytest.mark.asyncio
    async def test_embed_batch_mixed_success_failure(self):
        """embed_batch should include None for failed items"""
        mock_results = {"works": [0.5], "also_works": [0.6]}

        with patch.object(
            EmbeddingService,
            "_try_api",
            side_effect=lambda text: mock_results.get(text),
        ):
            results = await EmbeddingService.embed_batch(
                ["works", "fails", "also_works"]
            )
            assert len(results) == 3
            assert results[0] == [0.5]
            assert results[1] is None  # "fails" not in mock_results
            assert results[2] == [0.6]

    # ------------------------------------------------------------------
    # Additional: Vector dimension caching
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_vector_dim_cached_from_api_response(self, mock_settings):
        """_vector_dim should be set from the first API response dimension"""
        mock_embedding = [0.1, 0.2, 0.3, 0.4, 0.5]  # 5-dim

        mock_response = MagicMock(spec=httpx.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"embedding": mock_embedding}]
        }

        with patch(
            "httpx.AsyncClient.post",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            assert EmbeddingService._vector_dim is None
            await EmbeddingService.embed_text("test")
            assert EmbeddingService._vector_dim == 5

    @pytest.mark.asyncio
    async def test_vector_dim_not_set_on_failure(self, mock_api_connect_error):
        """_vector_dim should remain None when API call fails"""
        assert EmbeddingService._vector_dim is None
        await EmbeddingService.embed_text("test")
        assert EmbeddingService._vector_dim is None

    # ------------------------------------------------------------------
    # Text truncation: long texts are cut to 3000 chars
    # ------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_text_truncation(self, mock_api_success):
        """Texts longer than 3000 chars should be truncated before API call"""
        long_text = "a" * 5000
        await EmbeddingService.embed_text(long_text)
        # The mock API should have received truncated text
        call_kwargs = mock_api_success.call_args[1]
        sent_json = call_kwargs["json"]
        assert len(sent_json["input"]) == 3000
