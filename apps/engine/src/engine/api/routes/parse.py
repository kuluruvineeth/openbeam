from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, HTTPException, UploadFile

from engine.core.config import settings
from engine.core.logging import get_logger
from engine.models.requests import ParseUrlRequest
from engine.models.responses import ParseResponse
from engine.services.parser import ParserService

router = APIRouter()
logger = get_logger(__name__)
parser_service = ParserService()


@router.post("", response_model=ParseResponse)
async def parse_document(
    file: UploadFile,
    chunk: bool = True,
    max_chunk_size: int = 1500,
    overlap: int = 150,
) -> ParseResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename required")

    content = await file.read()
    file_size_mb = len(content) / (1024 * 1024)

    if file_size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size: {settings.max_file_size_mb}MB",
        )

    suffix = Path(file.filename).suffix
    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        result = await parser_service.parse(tmp_path, mime_type=file.content_type)

        chunks = None
        if chunk and result.elements:
            chunks = await parser_service.chunk_elements(
                result.elements,
                max_characters=max_chunk_size,
                overlap=overlap,
            )

        return ParseResponse(
            filename=file.filename,
            mime_type=file.content_type,
            elements=result.elements,
            chunks=chunks,
            metadata=result.metadata,
            text_length=result.text_length,
            page_count=result.page_count,
        )
    except Exception as e:
        logger.error("parse_failed", filename=file.filename, error=str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)


@router.post("/url", response_model=ParseResponse)
async def parse_from_url(
    request: ParseUrlRequest,
    chunk: bool = True,
    max_chunk_size: int = 1500,
    overlap: int = 150,
) -> ParseResponse:
    import httpx

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(request.url, follow_redirects=True)
            response.raise_for_status()
            content = response.content
            content_type = response.headers.get("content-type")
            if content_type:
                content_type = content_type.split(";")[0].strip()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}") from e

    filename = request.filename or request.url.split("/")[-1].split("?")[0]
    suffix = Path(filename).suffix or ".bin"

    tmp_path = None
    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        result = await parser_service.parse(tmp_path, mime_type=content_type)

        chunks = None
        if chunk and result.elements:
            chunks = await parser_service.chunk_elements(
                result.elements,
                max_characters=max_chunk_size,
                overlap=overlap,
            )

        return ParseResponse(
            filename=filename,
            mime_type=content_type,
            elements=result.elements,
            chunks=chunks,
            metadata=result.metadata,
            text_length=result.text_length,
            page_count=result.page_count,
        )
    except Exception as e:
        logger.error("parse_url_failed", url=request.url, error=str(e))
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)
