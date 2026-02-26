from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from engine.common.logging import get_logger

if TYPE_CHECKING:
    from engine.common.config import CPUServiceSettings

logger = get_logger(__name__)


@dataclass
class BrowserAction:
    step: int
    action: str
    details: str


@dataclass
class BrowserTaskResult:
    status: str
    extracted_content: str
    actions: list[BrowserAction] = field(default_factory=list)
    screenshots: list[str] = field(default_factory=list)
    final_url: str | None = None
    error: str | None = None


class BrowserService:
    def __init__(self, settings: CPUServiceSettings) -> None:
        self._settings = settings
        self._playwright: Any = None
        self._browser: Any = None

    async def initialize(self) -> None:
        try:
            from playwright.async_api import async_playwright  # type: ignore[import-not-found]

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=self._settings.browser_headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                ],
            )
            logger.info(
                "browser_service_initialized",
                headless=self._settings.browser_headless,
            )
        except ImportError as e:
            msg = "Install browser deps: uv sync --extra browser"
            raise ImportError(msg) from e

    async def run_task(
        self,
        task: str,
        start_url: str | None = None,
        max_steps: int | None = None,
    ) -> BrowserTaskResult:
        effective_max_steps = min(
            max_steps or self._settings.browser_max_steps,
            self._settings.browser_max_steps,
        )

        try:
            from browser_use import Agent, ChatAnthropic  # type: ignore[import-not-found]

            llm = ChatAnthropic(model=self._settings.browser_llm_model)

            agent = Agent(
                task=task,
                llm=llm,
                browser=self._browser,
                max_steps=effective_max_steps,
            )

            result = await asyncio.wait_for(
                agent.run(),
                timeout=self._settings.browser_timeout_seconds,
            )

            actions: list[BrowserAction] = []
            screenshots: list[str] = []
            extracted_content = ""
            final_url: str | None = None

            if hasattr(result, "history") and result.history:
                for i, step in enumerate(result.history):
                    action_str = str(getattr(step, "action", "unknown"))
                    details_str = str(getattr(step, "result", ""))
                    actions.append(
                        BrowserAction(step=i + 1, action=action_str, details=details_str)
                    )

                    screenshot_data = getattr(step, "screenshot", None)
                    if screenshot_data and isinstance(screenshot_data, bytes):
                        screenshots.append(base64.b64encode(screenshot_data).decode())

            if hasattr(result, "extracted_content"):
                extracted_content = str(result.extracted_content or "")
            elif hasattr(result, "final_result"):
                extracted_content = str(result.final_result or "")

            if hasattr(result, "final_url"):
                final_url = str(result.final_url)

            return BrowserTaskResult(
                status="completed",
                extracted_content=extracted_content,
                actions=actions,
                screenshots=screenshots[-3:],
                final_url=final_url,
            )

        except TimeoutError:
            return BrowserTaskResult(
                status="timeout",
                extracted_content="",
                error=f"Task exceeded {self._settings.browser_timeout_seconds}s timeout",
            )
        except Exception as e:
            logger.error("browser_task_failed", error=str(e))
            return BrowserTaskResult(
                status="failed",
                extracted_content="",
                error=str(e),
            )

    async def close(self) -> None:
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("browser_service_closed")
