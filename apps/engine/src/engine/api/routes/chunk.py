from fastapi import APIRouter

from engine.models.document import DocumentChunk
from engine.models.requests import ChunkRequest
from engine.models.responses import ChunkResponse
from engine.services.chunker import ChunkerService

router = APIRouter()
chunker_service = ChunkerService()


@router.post("", response_model=ChunkResponse)
async def chunk_text(request: ChunkRequest) -> ChunkResponse:
    chunks = await chunker_service.chunk_text(
        request.text,
        max_characters=request.max_characters,
        overlap=request.overlap,
    )

    doc_chunks = [DocumentChunk(index=i, text=chunk) for i, chunk in enumerate(chunks)]

    return ChunkResponse(
        chunks=doc_chunks,
        total_chunks=len(doc_chunks),
        total_characters=sum(len(c.text) for c in doc_chunks),
    )
