from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from engine.core.config import settings
from engine.core.logging import get_logger

logger = get_logger(__name__)


class StorageService:
    def __init__(self) -> None:
        self._client: Any = None

    @property
    def client(self) -> Any:
        if self._client is None:
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
                config=Config(signature_version="s3v4"),
            )
        return self._client

    async def download(self, key: str, destination: Path) -> Path:
        self.client.download_file(settings.s3_bucket, key, str(destination))
        logger.info("file_downloaded", key=key, destination=str(destination))
        return destination

    async def upload(
        self,
        key: str,
        source: Path,
        content_type: str | None = None,
    ) -> str:
        extra_args = {"ContentType": content_type} if content_type else {}
        self.client.upload_file(
            str(source), settings.s3_bucket, key, ExtraArgs=extra_args
        )
        logger.info("file_uploaded", key=key)
        return f"s3://{settings.s3_bucket}/{key}"

    async def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=settings.s3_bucket, Key=key)
            return True
        except ClientError:
            return False

    async def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=settings.s3_bucket, Key=key)
        logger.info("file_deleted", key=key)

    async def get_signed_url(self, key: str, expiration: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.s3_bucket, "Key": key},
            ExpiresIn=expiration,
        )
