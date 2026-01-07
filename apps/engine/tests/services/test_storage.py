from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from engine.services.storage import StorageService


def create_mock_s3_client():
    mock_client = AsyncMock()
    mock_session = MagicMock()
    mock_context_manager = AsyncMock()
    mock_context_manager.__aenter__.return_value = mock_client
    mock_context_manager.__aexit__.return_value = None
    mock_session.client.return_value = mock_context_manager
    return mock_client, mock_session


def default_settings_patch(mock_settings):
    mock_settings.s3_bucket = "test-bucket"
    mock_settings.s3_endpoint = None
    mock_settings.s3_access_key = None
    mock_settings.s3_secret_key = None
    mock_settings.s3_region = None


class TestStorageServiceInit:
    def test_init_creates_session(self):
        with patch("engine.services.storage.aioboto3.Session") as mock_session:
            service = StorageService()

            mock_session.assert_called_once()
            assert service._session is mock_session.return_value


class TestGetClient:
    @pytest.mark.asyncio
    async def test_creates_s3_client_with_config(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            mock_settings.s3_endpoint = "https://s3.example.com"
            mock_settings.s3_access_key = "access_key"
            mock_settings.s3_secret_key = "secret_key"
            mock_settings.s3_region = "us-east-1"

            service = StorageService()
            async with service._get_client() as client:
                assert client is mock_client

            mock_session.client.assert_called_once()
            call_kwargs = mock_session.client.call_args
            assert call_kwargs[0][0] == "s3"
            assert call_kwargs[1]["endpoint_url"] == "https://s3.example.com"


class TestDownload:
    @pytest.mark.asyncio
    async def test_downloads_file(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            destination = Path("/tmp/test.txt")
            result = await service.download("test/key.txt", destination)

            mock_client.download_file.assert_called_once_with(
                "test-bucket",
                "test/key.txt",
                str(destination),
            )
            assert result == destination


class TestUpload:
    @pytest.mark.asyncio
    async def test_uploads_file_without_content_type(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            source = Path("/tmp/source.txt")
            result = await service.upload("dest/key.txt", source)

            mock_client.upload_file.assert_called_once_with(
                str(source),
                "test-bucket",
                "dest/key.txt",
                ExtraArgs={},
            )
            assert result == "s3://test-bucket/dest/key.txt"

    @pytest.mark.asyncio
    async def test_uploads_file_with_content_type(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            source = Path("/tmp/source.pdf")
            await service.upload("dest/key.pdf", source, content_type="application/pdf")

            mock_client.upload_file.assert_called_once_with(
                str(source),
                "test-bucket",
                "dest/key.pdf",
                ExtraArgs={"ContentType": "application/pdf"},
            )


class TestExists:
    @pytest.mark.asyncio
    async def test_returns_true_when_exists(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            result = await service.exists("test/key.txt")

            mock_client.head_object.assert_called_once_with(
                Bucket="test-bucket",
                Key="test/key.txt",
            )
            assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_when_not_exists(self):
        mock_client = AsyncMock()
        mock_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "404", "Message": "Not Found"}},
            "HeadObject",
        )
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            result = await service.exists("nonexistent/key.txt")

            assert result is False


class TestDelete:
    @pytest.mark.asyncio
    async def test_deletes_file(self):
        mock_client = AsyncMock()
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            await service.delete("test/key.txt")

            mock_client.delete_object.assert_called_once_with(
                Bucket="test-bucket",
                Key="test/key.txt",
            )


class TestGetSignedUrl:
    @pytest.mark.asyncio
    async def test_generates_presigned_url(self):
        mock_client = AsyncMock()
        mock_client.generate_presigned_url.return_value = "https://signed-url.example.com"
        mock_session = MagicMock()
        mock_context_manager = AsyncMock()
        mock_context_manager.__aenter__.return_value = mock_client
        mock_context_manager.__aexit__.return_value = None
        mock_session.client.return_value = mock_context_manager

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            mock_settings.s3_bucket = "test-bucket"
            mock_settings.s3_endpoint = None
            mock_settings.s3_access_key = None
            mock_settings.s3_secret_key = None
            mock_settings.s3_region = None

            service = StorageService()
            result = await service.get_signed_url("test/key.txt")

            mock_client.generate_presigned_url.assert_called_once_with(
                "get_object",
                Params={"Bucket": "test-bucket", "Key": "test/key.txt"},
                ExpiresIn=3600,
            )
            assert result == "https://signed-url.example.com"

    @pytest.mark.asyncio
    async def test_custom_expiration(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.generate_presigned_url.return_value = "https://signed-url.example.com"

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            await service.get_signed_url("test/key.txt", expiration=7200)

            call_kwargs = mock_client.generate_presigned_url.call_args
            assert call_kwargs[1]["ExpiresIn"] == 7200


class TestStorageErrorHandling:
    @pytest.mark.asyncio
    async def test_download_permission_denied(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.download_file.side_effect = ClientError(
            {"Error": {"Code": "403", "Message": "Access Denied"}},
            "GetObject",
        )

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            with pytest.raises(ClientError) as exc_info:
                await service.download("test/key.txt", Path("/tmp/test.txt"))

            assert exc_info.value.response["Error"]["Code"] == "403"

    @pytest.mark.asyncio
    async def test_upload_permission_denied(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.upload_file.side_effect = ClientError(
            {"Error": {"Code": "403", "Message": "Access Denied"}},
            "PutObject",
        )

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            with pytest.raises(ClientError) as exc_info:
                await service.upload("test/key.txt", Path("/tmp/source.txt"))

            assert exc_info.value.response["Error"]["Code"] == "403"

    @pytest.mark.asyncio
    async def test_delete_not_found(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.delete_object.side_effect = ClientError(
            {"Error": {"Code": "NoSuchKey", "Message": "Key not found"}},
            "DeleteObject",
        )

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            with pytest.raises(ClientError) as exc_info:
                await service.delete("nonexistent/key.txt")

            assert exc_info.value.response["Error"]["Code"] == "NoSuchKey"

    @pytest.mark.asyncio
    async def test_exists_returns_false_on_server_error(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.head_object.side_effect = ClientError(
            {"Error": {"Code": "500", "Message": "Internal Server Error"}},
            "HeadObject",
        )

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            result = await service.exists("test/key.txt")

            assert result is False

    @pytest.mark.asyncio
    async def test_download_timeout(self):
        mock_client, mock_session = create_mock_s3_client()
        mock_client.download_file.side_effect = TimeoutError()

        with (
            patch("engine.services.storage.aioboto3.Session", return_value=mock_session),
            patch("engine.services.storage.settings") as mock_settings,
            patch("engine.services.storage.logger"),
        ):
            default_settings_patch(mock_settings)

            service = StorageService()
            with pytest.raises(asyncio.TimeoutError):
                await service.download("test/key.txt", Path("/tmp/test.txt"))
