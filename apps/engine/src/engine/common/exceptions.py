from __future__ import annotations


class EngineError(Exception):
    def __init__(self, message: str, code: str = "ENGINE_ERROR") -> None:
        self.message = message
        self.code = code
        super().__init__(message)


class ValidationError(EngineError):
    def __init__(self, message: str) -> None:
        super().__init__(message, code="VALIDATION_ERROR")


class ParseError(EngineError):
    def __init__(self, message: str, file_type: str | None = None) -> None:
        self.file_type = file_type
        super().__init__(message, code="PARSE_ERROR")


class StorageError(EngineError):
    def __init__(self, message: str, bucket: str | None = None) -> None:
        self.bucket = bucket
        super().__init__(message, code="STORAGE_ERROR")


class GPUServiceError(EngineError):
    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        retryable: bool = True,
    ) -> None:
        self.status_code = status_code
        self.retryable = retryable
        super().__init__(message, code="GPU_SERVICE_ERROR")


class ModelLoadError(EngineError):
    def __init__(self, message: str, model_name: str | None = None) -> None:
        self.model_name = model_name
        super().__init__(message, code="MODEL_LOAD_ERROR")


class RateLimitError(EngineError):
    def __init__(self, message: str, retry_after_seconds: float | None = None) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__(message, code="RATE_LIMIT_ERROR")
