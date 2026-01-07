from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import TYPE_CHECKING

import aioboto3
from botocore.config import Config  # type: ignore[import-untyped]
from botocore.exceptions import ClientError  # type: ignore[import-untyped]

from engine.core.config import settings
from engine.core.logging import get_logger

if TYPE_CHECKING:
    from types_aiobotocore_s3 import S3Client

logger = get_logger(__name__)


class StorageService:
    def __init__(self) -> None:
        self._session = aioboto3.Session()

    @asynccontextmanager
    async def _get_client(self) -> AsyncIterator["S3Client"]:
        access_key = None
        if settings.s3_access_key:
            access_key = (
                settings.s3_access_key.get_secret_value()
                if hasattr(settings.s3_access_key, "get_secret_value")
                else settings.s3_access_key
            )
        secret_key = None
        if settings.s3_secret_key:
            secret_key = (
                settings.s3_secret_key.get_secret_value()
                if hasattr(settings.s3_secret_key, "get_secret_value")
                else settings.s3_secret_key
            )
        async with self._session.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        ) as client:
            yield client

    async def download(self, key: str, destination: Path) -> Path:
        async with self._get_client() as client:
            await client.download_file(settings.s3_bucket, key, str(destination))
        logger.info("file_downloaded", key=key, destination=str(destination))
        return destination

    async def upload(
        self,
        key: str,
        source: Path,
        content_type: str | None = None,
    ) -> str:
        extra_args: dict[str, str] = {}
        if content_type:
            extra_args["ContentType"] = content_type
        async with self._get_client() as client:
            await client.upload_file(
                str(source), settings.s3_bucket, key, ExtraArgs=extra_args
            )
        logger.info("file_uploaded", key=key)
        return f"s3://{settings.s3_bucket}/{key}"

    async def exists(self, key: str) -> bool:
        try:
            async with self._get_client() as client:
                await client.head_object(Bucket=settings.s3_bucket, Key=key)
            return True
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            if error_code in ("404", "NoSuchKey"):
                return False
            logger.warning(
                "s3_exists_error",
                key=key,
                error_code=error_code,
                error=str(e),
            )
            return False

    async def delete(self, key: str) -> None:
        async with self._get_client() as client:
            await client.delete_object(Bucket=settings.s3_bucket, Key=key)
        logger.info("file_deleted", key=key)

    async def get_signed_url(self, key: str, expiration: int = 3600) -> str:
        async with self._get_client() as client:
            url: str = await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.s3_bucket, "Key": key},
                ExpiresIn=expiration,
            )
        return url
