from __future__ import annotations

from engine.common.exceptions import (
    EngineError,
    GPUServiceError,
    ModelLoadError,
    ParseError,
    RateLimitError,
    StorageError,
    ValidationError,
)


class TestEngineError:
    def test_basic_error(self):
        error = EngineError("Something went wrong")
        assert str(error) == "Something went wrong"
        assert error.message == "Something went wrong"
        assert error.code == "ENGINE_ERROR"

    def test_custom_code(self):
        error = EngineError("Error", code="CUSTOM_ERROR")
        assert error.code == "CUSTOM_ERROR"


class TestValidationError:
    def test_validation_error(self):
        error = ValidationError("Invalid input")
        assert error.code == "VALIDATION_ERROR"
        assert error.message == "Invalid input"


class TestParseError:
    def test_parse_error_without_file_type(self):
        error = ParseError("Failed to parse")
        assert error.code == "PARSE_ERROR"
        assert error.file_type is None

    def test_parse_error_with_file_type(self):
        error = ParseError("Failed to parse", file_type="pdf")
        assert error.file_type == "pdf"


class TestStorageError:
    def test_storage_error_without_bucket(self):
        error = StorageError("Failed to upload")
        assert error.code == "STORAGE_ERROR"
        assert error.bucket is None

    def test_storage_error_with_bucket(self):
        error = StorageError("Failed to upload", bucket="my-bucket")
        assert error.bucket == "my-bucket"


class TestGPUServiceError:
    def test_default_retryable(self):
        error = GPUServiceError("GPU error")
        assert error.code == "GPU_SERVICE_ERROR"
        assert error.retryable is True
        assert error.status_code is None

    def test_with_status_code(self):
        error = GPUServiceError("GPU error", status_code=500)
        assert error.status_code == 500
        assert error.retryable is True

    def test_non_retryable(self):
        error = GPUServiceError("Auth error", status_code=401, retryable=False)
        assert error.retryable is False


class TestModelLoadError:
    def test_model_load_error_without_name(self):
        error = ModelLoadError("Failed to load")
        assert error.code == "MODEL_LOAD_ERROR"
        assert error.model_name is None

    def test_model_load_error_with_name(self):
        error = ModelLoadError("Failed to load", model_name="BAAI/bge-m3")
        assert error.model_name == "BAAI/bge-m3"


class TestRateLimitError:
    def test_rate_limit_error_without_retry(self):
        error = RateLimitError("Too many requests")
        assert error.code == "RATE_LIMIT_ERROR"
        assert error.retry_after_seconds is None

    def test_rate_limit_error_with_retry(self):
        error = RateLimitError("Too many requests", retry_after_seconds=60.0)
        assert error.retry_after_seconds == 60.0
