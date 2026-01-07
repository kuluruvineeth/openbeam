from __future__ import annotations

import pytest

from engine.common.security.api_key import APIKeyAuth, generate_api_key


class TestGenerateAPIKey:
    def test_default_prefix(self):
        key = generate_api_key()
        assert key.startswith("sk_live_")
        assert len(key) >= 40

    def test_custom_prefix(self):
        key = generate_api_key(prefix="sk_test")
        assert key.startswith("sk_test_")

    def test_uniqueness(self):
        keys = [generate_api_key() for _ in range(100)]
        assert len(set(keys)) == 100

    def test_cryptographic_randomness(self):
        key = generate_api_key()
        token_part = key.split("_", 2)[2]
        assert len(token_part) >= 32

    def test_url_safe_characters(self):
        key = generate_api_key()
        token_part = key.split("_", 2)[2]
        for char in token_part:
            assert char.isalnum() or char in "-_"


class TestAPIKeyAuth:
    def test_immutable(self):
        auth = APIKeyAuth(key_id="test", key_hash="hash123")
        with pytest.raises(AttributeError):
            auth.key_id = "new"

    def test_repr_hides_hash(self):
        auth = APIKeyAuth(key_id="sk_live_...", key_hash="secret_hash_value")
        repr_str = repr(auth)
        assert "sk_live_..." in repr_str
        assert "secret_hash_value" not in repr_str

    def test_has_timestamp(self):
        auth = APIKeyAuth(key_id="test", key_hash="hash")
        assert auth.authenticated_at is not None
