from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    debug: bool = False
    log_level: str = "INFO"
    environment: str = "development"

    host: str = "0.0.0.0"
    port: int = 8000

    cors_origins: list[str] = ["*"]

    s3_endpoint: str = "https://storage.googleapis.com"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = ""
    s3_region: str = "auto"

    redis_url: str = "redis://localhost:6379"

    max_file_size_mb: int = 100
    temp_dir: str = "/tmp/engine"

    parser_strategy: Literal["fast", "hi_res", "ocr_only", "auto"] = "fast"


settings = Settings()
