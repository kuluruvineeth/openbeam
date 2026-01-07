from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from engine.services.storage import StorageService


def create_client_error(code: str, message: str) -> ClientError:
    return ClientError(
        error_response={"Error": {"Code": code, "Message": message}},
        operation_name="test",
    )


@pytest.mark.integration
class TestStorageServiceIntegration:
    @pytest.fixture
    def storage(self):
        return StorageService()

    @pytest.fixture
    def mock_s3_client(self):
        client = AsyncMock()
        return client

    @pytest.fixture
    def mock_session(self, mock_s3_client):
        session = MagicMock()
        context_manager = AsyncMock()
        context_manager.__aenter__.return_value = mock_s3_client
        context_manager.__aexit__.return_value = None
        session.client.return_value = context_manager
        return session

    @pytest.mark.asyncio
    async def test_upload_download_roundtrip(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "upload.txt"
            source.write_text("test content")
            destination = Path(tmpdir) / "download.txt"

            mock_s3_client.upload_file = AsyncMock()
            mock_s3_client.download_file = AsyncMock(
                side_effect=lambda bucket, key, dest: Path(dest).write_text(
                    "test content"
                )
            )

            with patch.object(storage, "_session", mock_session):
                uri = await storage.upload("test/file.txt", source)
                assert uri.startswith("s3://")

                await storage.download("test/file.txt", destination)

            mock_s3_client.upload_file.assert_called_once()
            mock_s3_client.download_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_with_content_type(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "document.pdf"
            source.write_bytes(b"%PDF-1.4")

            mock_s3_client.upload_file = AsyncMock()

            with patch.object(storage, "_session", mock_session):
                await storage.upload(
                    "docs/document.pdf", source, content_type="application/pdf"
                )

            call_args = mock_s3_client.upload_file.call_args
            assert call_args.kwargs.get("ExtraArgs") == {
                "ContentType": "application/pdf"
            }

    @pytest.mark.asyncio
    async def test_exists_returns_true_for_existing_file(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.head_object = AsyncMock(return_value={})

        with patch.object(storage, "_session", mock_session):
            exists = await storage.exists("existing/file.txt")

        assert exists is True

    @pytest.mark.asyncio
    async def test_exists_returns_false_for_missing_file(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.head_object = AsyncMock(
            side_effect=create_client_error("404", "Not Found")
        )

        with patch.object(storage, "_session", mock_session):
            exists = await storage.exists("missing/file.txt")

        assert exists is False

    @pytest.mark.asyncio
    async def test_delete_calls_s3_delete(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.delete_object = AsyncMock()

        with patch.object(storage, "_session", mock_session):
            await storage.delete("file/to/delete.txt")

        mock_s3_client.delete_object.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_signed_url(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        expected_url = "https://bucket.s3.amazonaws.com/file.txt?signature=abc"
        mock_s3_client.generate_presigned_url = AsyncMock(return_value=expected_url)

        with patch.object(storage, "_session", mock_session):
            url = await storage.get_signed_url("file.txt", expiration=7200)

        assert url == expected_url
        call_args = mock_s3_client.generate_presigned_url.call_args
        assert call_args.kwargs.get("ExpiresIn") == 7200


@pytest.mark.integration
class TestStorageServiceErrorHandling:
    @pytest.fixture
    def storage(self):
        return StorageService()

    @pytest.fixture
    def mock_s3_client(self):
        return AsyncMock()

    @pytest.fixture
    def mock_session(self, mock_s3_client):
        session = MagicMock()
        context_manager = AsyncMock()
        context_manager.__aenter__.return_value = mock_s3_client
        context_manager.__aexit__.return_value = None
        session.client.return_value = context_manager
        return session

    @pytest.mark.asyncio
    async def test_download_permission_denied(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.download_file = AsyncMock(
            side_effect=create_client_error("403", "Access Denied")
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            destination = Path(tmpdir) / "file.txt"

            with (
                patch.object(storage, "_session", mock_session),
                pytest.raises(ClientError) as exc_info,
            ):
                await storage.download("protected/file.txt", destination)

            assert exc_info.value.response["Error"]["Code"] == "403"

    @pytest.mark.asyncio
    async def test_upload_quota_exceeded(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.upload_file = AsyncMock(
            side_effect=create_client_error("QuotaExceeded", "Storage quota exceeded")
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "large_file.bin"
            source.write_bytes(b"x" * 1000)

            with (
                patch.object(storage, "_session", mock_session),
                pytest.raises(ClientError) as exc_info,
            ):
                await storage.upload("large_file.bin", source)

            assert exc_info.value.response["Error"]["Code"] == "QuotaExceeded"

    @pytest.mark.asyncio
    async def test_delete_not_found_silent(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        mock_s3_client.delete_object = AsyncMock()

        with patch.object(storage, "_session", mock_session):
            await storage.delete("nonexistent/file.txt")


@pytest.mark.integration
class TestStorageServiceDataIntegrity:
    @pytest.fixture
    def storage(self):
        return StorageService()

    @pytest.fixture
    def mock_s3_client(self):
        return AsyncMock()

    @pytest.fixture
    def mock_session(self, mock_s3_client):
        session = MagicMock()
        context_manager = AsyncMock()
        context_manager.__aenter__.return_value = mock_s3_client
        context_manager.__aexit__.return_value = None
        session.client.return_value = context_manager
        return session

    @pytest.mark.asyncio
    async def test_binary_file_handling(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        binary_content = bytes(range(256)) * 100

        with tempfile.TemporaryDirectory() as tmpdir:
            source = Path(tmpdir) / "binary.bin"
            source.write_bytes(binary_content)

            mock_s3_client.upload_file = AsyncMock()

            with patch.object(storage, "_session", mock_session):
                uri = await storage.upload("binary.bin", source)

            assert "binary.bin" in uri
            mock_s3_client.upload_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_unicode_key_handling(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        keys = [
            "docs/日本語.txt",
            "files/файл.pdf",
            "uploads/αρχείο.doc",
        ]

        mock_s3_client.head_object = AsyncMock(return_value={})

        with patch.object(storage, "_session", mock_session):
            for key in keys:
                exists = await storage.exists(key)
                assert exists is True

    @pytest.mark.asyncio
    async def test_deep_path_handling(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        deep_key = "a/b/c/d/e/f/g/h/i/j/deep_file.txt"

        mock_s3_client.head_object = AsyncMock(return_value={})

        with patch.object(storage, "_session", mock_session):
            exists = await storage.exists(deep_key)

        assert exists is True
        call_args = mock_s3_client.head_object.call_args
        assert call_args.kwargs.get("Key") == deep_key


@pytest.mark.integration
class TestStorageServiceConcurrency:
    @pytest.fixture
    def storage(self):
        return StorageService()

    @pytest.fixture
    def mock_s3_client(self):
        return AsyncMock()

    @pytest.fixture
    def mock_session(self, mock_s3_client):
        session = MagicMock()
        context_manager = AsyncMock()
        context_manager.__aenter__.return_value = mock_s3_client
        context_manager.__aexit__.return_value = None
        session.client.return_value = context_manager
        return session

    @pytest.mark.asyncio
    async def test_concurrent_exists_checks(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        import asyncio

        call_count = 0

        async def track_head_object(**kwargs):
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.01)
            return {}

        mock_s3_client.head_object = track_head_object

        keys = [f"file{i}.txt" for i in range(20)]

        with patch.object(storage, "_session", mock_session):
            results = await asyncio.gather(*[storage.exists(key) for key in keys])

        assert all(results)
        assert call_count == 20

    @pytest.mark.asyncio
    async def test_concurrent_uploads(
        self, storage: StorageService, mock_session, mock_s3_client
    ):
        import asyncio

        uploaded_files: list[str] = []

        async def track_upload(source, bucket, key, **kwargs):
            uploaded_files.append(key)
            await asyncio.sleep(0.01)

        mock_s3_client.upload_file = track_upload

        with tempfile.TemporaryDirectory() as tmpdir:
            files = []
            for i in range(10):
                path = Path(tmpdir) / f"file{i}.txt"
                path.write_text(f"content {i}")
                files.append((f"uploads/file{i}.txt", path))

            with patch.object(storage, "_session", mock_session):
                tasks = [storage.upload(key, path) for key, path in files]
                await asyncio.gather(*tasks)

        assert len(uploaded_files) == 10
