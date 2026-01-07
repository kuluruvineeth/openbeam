from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from engine.parsers import ParserRegistry

router = APIRouter()


class ParserInfo(BaseModel):
    name: str
    mimes: list[str]
    extensions: list[str]


class SupportedTypesResponse(BaseModel):
    mimes: list[str]
    extensions: list[str]
    parsers: list[ParserInfo]


@router.get("", response_model=SupportedTypesResponse)
async def get_supported_types() -> SupportedTypesResponse:
    parsers = [
        ParserInfo(
            name=parser.name,
            mimes=parser.supported_mimes,
            extensions=parser.supported_extensions,
        )
        for parser in ParserRegistry.all_parsers()
    ]

    return SupportedTypesResponse(
        mimes=ParserRegistry.supported_mimes(),
        extensions=ParserRegistry.supported_extensions(),
        parsers=parsers,
    )
