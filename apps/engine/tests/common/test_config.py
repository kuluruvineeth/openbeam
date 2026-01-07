from __future__ import annotations

import pytest

from engine.common.config import (
    BaseServiceSettings,
    CPUServiceSettings,
    GPUServiceSettings,
    get_cpu_settings,
    get_gpu_settings,
)


class TestBaseServiceSettings:
    def test_default_values(self):
        settings = BaseServiceSettings(
            _env_file=None  # type: ignore[call-arg]
        )
        assert settings.debug is False
        assert settings.log_level == "INFO"
        assert settings.environment == "development"
        assert settings.host == "0.0.0.0"
        assert settings.port == 8000
        assert settings.cors_origins == ["*"]
        assert settings.redis_url == "redis://localhost:6379"

    def test_log_level_options(self):
        for level in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            settings = BaseServiceSettings(log_level=level)
            assert settings.log_level == level

    def test_environment_options(self):
        for env in ["development", "staging", "production"]:
            settings = BaseServiceSettings(environment=env)
            assert settings.environment == env


class TestCPUServiceSettings:
    def test_default_values(self):
        settings = CPUServiceSettings()
        assert settings.port == 8000
        assert settings.workers == 4
        assert settings.gpu_service_url == "http://localhost:8001"
        assert settings.gpu_service_timeout_seconds == 30.0
        assert settings.max_file_size_mb == 100
        assert settings.temp_dir == "/tmp/engine"
        assert settings.parser_strategy == "fast"
        assert settings.chunk_max_size == 1500
        assert settings.chunk_overlap == 150

    def test_parser_strategy_options(self):
        for strategy in ["fast", "hi_res", "ocr_only", "auto"]:
            settings = CPUServiceSettings(parser_strategy=strategy)
            assert settings.parser_strategy == strategy


class TestGPUServiceSettings:
    def test_default_values(self):
        settings = GPUServiceSettings()
        assert settings.port == 8001
        assert settings.provider_type == "ray_serve"
        assert settings.model_cache_dir == "/models"
        assert settings.embedding_model == "BAAI/bge-m3"
        assert settings.embedding_batch_size == 32
        assert settings.embedding_gpu_fraction == 0.5
        assert settings.reranker_model == "BAAI/bge-reranker-v2-m3"
        assert settings.reranker_batch_size == 16
        assert settings.reranker_gpu_fraction == 0.3
        assert settings.entity_model == "urchade/gliner_multi_pii-v1"
        assert settings.entity_gpu_fraction == 0.2

    def test_provider_type_options(self):
        for provider in ["ray_serve", "modal"]:
            settings = GPUServiceSettings(provider_type=provider)
            assert settings.provider_type == provider

    def test_gpu_fractions_sum_to_one(self):
        settings = GPUServiceSettings()
        total = (
            settings.embedding_gpu_fraction
            + settings.reranker_gpu_fraction
            + settings.entity_gpu_fraction
        )
        assert total == pytest.approx(1.0)


class TestSettingsFactories:
    def test_get_cpu_settings_cached(self):
        settings1 = get_cpu_settings()
        settings2 = get_cpu_settings()
        assert settings1 is settings2

    def test_get_gpu_settings_cached(self):
        settings1 = get_gpu_settings()
        settings2 = get_gpu_settings()
        assert settings1 is settings2
