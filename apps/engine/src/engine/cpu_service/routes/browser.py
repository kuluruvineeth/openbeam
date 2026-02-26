from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request

from engine.common.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


class BrowserTaskRequest(BaseModel):
    task: str = Field(..., min_length=1, max_length=5000)
    start_url: str | None = Field(default=None, max_length=2048)
    max_steps: int = Field(default=25, ge=1, le=100)


class BrowserActionResponse(BaseModel):
    step: int
    action: str
    details: str


class BrowserTaskResponse(BaseModel):
    status: str
    extracted_content: str
    actions: list[BrowserActionResponse]
    screenshots: list[str]
    final_url: str | None
    error: str | None


@router.post("/task", response_model=BrowserTaskResponse)
async def run_browser_task(
    request: Request,
    body: BrowserTaskRequest,
) -> BrowserTaskResponse:
    browser_service = getattr(request.app.state, "browser_service", None)
    if browser_service is None:
        raise HTTPException(
            status_code=503,
            detail="Browser service is not enabled. Set CPU_ENABLE_BROWSER=true",
        )

    result = await browser_service.run_task(
        task=body.task,
        start_url=body.start_url,
        max_steps=body.max_steps,
    )

    return BrowserTaskResponse(
        status=result.status,
        extracted_content=result.extracted_content,
        actions=[
            BrowserActionResponse(
                step=a.step,
                action=a.action,
                details=a.details,
            )
            for a in result.actions
        ],
        screenshots=result.screenshots,
        final_url=result.final_url,
        error=result.error,
    )
