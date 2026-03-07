from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class SecuritySettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="SECURITY_",
    )

    require_auth: bool = True
    api_keys: list[SecretStr] = Field(default_factory=list)

    rate_limit_enabled: bool = True
    rate_limit_requests_per_minute: int = 60
    rate_limit_requests_per_hour: int = 1000
    rate_limit_burst_size: int = 10

    audit_enabled: bool = True

    allowed_origins: list[str] = Field(
        default_factory=lambda: ["https://app.openbeam.com"]
    )


class BaseServiceSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    environment: Literal["development", "staging", "production"] = "development"

    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    redis_url: str = "redis://localhost:6379"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


class CPUServiceSettings(BaseServiceSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="CPU_",
    )

    port: int = 8000
    workers: int = 4

    gpu_service_url: str = "http://localhost:8001"
    gpu_service_timeout_seconds: float = 30.0

    s3_endpoint: str = "https://storage.googleapis.com"
    s3_access_key: SecretStr | None = None
    s3_secret_key: SecretStr | None = None
    s3_bucket: str = ""
    s3_region: str = "auto"

    max_file_size_mb: int = 100
    temp_dir: str = "/tmp/engine"

    parser_strategy: Literal["fast", "hi_res", "ocr_only", "auto"] = "fast"

    chunk_max_size: int = 1500
    chunk_overlap: int = 150

    ltr_model_path: str | None = None

    enable_browser: bool = False
    browser_timeout_seconds: int = 120
    browser_headless: bool = True
    browser_max_steps: int = 50
    browser_llm_model: str = "claude-sonnet-4-5-20250929"

    enable_ml: bool = False
    ml_device: Literal["auto", "cpu", "mps", "cuda"] = "auto"
    embedding_cache_size: int = 10_000
    embedding_cache_dir: str | None = None


class GPUServiceSettings(BaseServiceSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="GPU_",
    )

    port: int = 8001

    provider_type: Literal["ray_serve", "modal"] = "ray_serve"

    model_cache_dir: str = "/models"

    embedding_model: str = "BAAI/bge-m3"
    embedding_batch_size: int = 32
    embedding_gpu_fraction: float = 0.5

    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    reranker_batch_size: int = 16
    reranker_gpu_fraction: float = 0.3

    entity_model: str = "urchade/gliner_multi_pii-v1"
    entity_gpu_fraction: float = 0.2

    ray_num_cpus: int = 4
    ray_dashboard_host: str = "0.0.0.0"
    ray_dashboard_port: int = 8265


@lru_cache
def get_cpu_settings() -> CPUServiceSettings:
    return CPUServiceSettings()


@lru_cache
def get_gpu_settings() -> GPUServiceSettings:
    return GPUServiceSettings()


@lru_cache
def get_security_settings() -> SecuritySettings:
    return SecuritySettings()
