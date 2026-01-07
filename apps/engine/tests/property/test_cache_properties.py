from __future__ import annotations

import hashlib
import tempfile
from unittest.mock import MagicMock

import pytest
from hypothesis import HealthCheck, given, settings, strategies as st

from engine.embeddings.cache import EmbeddingCache
from engine.reranker.cache import RerankCache

HASH_KEY_LENGTH = 32


class TestEmbeddingCacheKeyProperties:
    @pytest.fixture
    def cache(self):
        mock_redis = MagicMock()
        with tempfile.TemporaryDirectory() as tmpdir:
            c = EmbeddingCache(redis_client=mock_redis, disk_path=tmpdir)
            yield c
            c._disk.close()

    @pytest.mark.property
    @given(text=st.text(min_size=1), model=st.text(min_size=1))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_key_always_correct_length(self, cache, text: str, model: str):
        key = cache._key(text, model)
        assert len(key) == HASH_KEY_LENGTH

    @pytest.mark.property
    @given(text=st.text(min_size=1), model=st.text(min_size=1))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_key_always_hex_string(self, cache, text: str, model: str):
        key = cache._key(text, model)
        assert all(c in "0123456789abcdef" for c in key)

    @pytest.mark.property
    @given(text=st.text(min_size=1), model=st.text(min_size=1))
    @settings(max_examples=100, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_key_is_deterministic(self, cache, text: str, model: str):
        key1 = cache._key(text, model)
        key2 = cache._key(text, model)
        assert key1 == key2

    @pytest.mark.property
    @given(
        text1=st.text(min_size=1, max_size=100),
        text2=st.text(min_size=1, max_size=100),
        model=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=200, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_different_texts_different_keys(
        self, cache, text1: str, text2: str, model: str
    ):
        if text1 != text2:
            key1 = cache._key(text1, model)
            key2 = cache._key(text2, model)
            assert key1 != key2

    @pytest.mark.property
    @given(
        text=st.text(min_size=1, max_size=100),
        model1=st.text(min_size=1, max_size=50),
        model2=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=200, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_different_models_different_keys(
        self, cache, text: str, model1: str, model2: str
    ):
        if model1 != model2:
            key1 = cache._key(text, model1)
            key2 = cache._key(text, model2)
            assert key1 != key2

    @pytest.mark.property
    @given(text=st.text(min_size=1), model=st.text(min_size=1))
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_key_matches_expected_hash(self, cache, text: str, model: str):
        key = cache._key(text, model)
        expected = hashlib.sha256(f"{model}:{text}".encode()).hexdigest()[
            :HASH_KEY_LENGTH
        ]
        assert key == expected


class TestRerankCacheKeyProperties:
    @pytest.mark.property
    @given(
        query=st.text(min_size=1),
        passage=st.text(min_size=1),
        model=st.text(min_size=1),
    )
    @settings(max_examples=100)
    def test_key_always_correct_length(self, query: str, passage: str, model: str):
        cache = RerankCache()
        key = cache._make_key(query, passage, model)
        assert len(key) == HASH_KEY_LENGTH

    @pytest.mark.property
    @given(
        query=st.text(min_size=1),
        passage=st.text(min_size=1),
        model=st.text(min_size=1),
    )
    @settings(max_examples=100)
    def test_key_is_deterministic(self, query: str, passage: str, model: str):
        cache = RerankCache()
        key1 = cache._make_key(query, passage, model)
        key2 = cache._make_key(query, passage, model)
        assert key1 == key2

    @pytest.mark.property
    @given(
        query1=st.text(min_size=1, max_size=100),
        query2=st.text(min_size=1, max_size=100),
        passage=st.text(min_size=1, max_size=100),
        model=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=200)
    def test_different_queries_different_keys(
        self, query1: str, query2: str, passage: str, model: str
    ):
        if query1 != query2:
            cache = RerankCache()
            key1 = cache._make_key(query1, passage, model)
            key2 = cache._make_key(query2, passage, model)
            assert key1 != key2

    @pytest.mark.property
    @given(
        query=st.text(min_size=1, max_size=100),
        passage1=st.text(min_size=1, max_size=100),
        passage2=st.text(min_size=1, max_size=100),
        model=st.text(min_size=1, max_size=50),
    )
    @settings(max_examples=200)
    def test_different_passages_different_keys(
        self, query: str, passage1: str, passage2: str, model: str
    ):
        if passage1 != passage2:
            cache = RerankCache()
            key1 = cache._make_key(query, passage1, model)
            key2 = cache._make_key(query, passage2, model)
            assert key1 != key2
