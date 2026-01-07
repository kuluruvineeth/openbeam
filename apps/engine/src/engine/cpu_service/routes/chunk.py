from __future__ import annotations

from fastapi import APIRouter, Request

from engine.common.metrics import CHUNKS_CREATED_TOTAL
from engine.models.document import DocumentChunk
from engine.models.requests import ChunkRequest
from engine.models.responses import ChunkResponse

router = APIRouter()


@router.post("", response_model=ChunkResponse)
async def chunk_text(request: Request, body: ChunkRequest) -> ChunkResponse:
    chunker = request.app.state.chunker

    chunk_tuples = await chunker.chunk_text(
        body.text,
        max_characters=body.max_characters,
        overlap=body.overlap,
    )

    doc_chunks = [
        DocumentChunk(index=i, text=text) for i, (text, _, _) in enumerate(chunk_tuples)
    ]

    CHUNKS_CREATED_TOTAL.labels(strategy="default").inc(len(doc_chunks))

    return ChunkResponse(
        chunks=doc_chunks,
        total_chunks=len(doc_chunks),
        total_characters=sum(len(c.text) for c in doc_chunks),
    )
