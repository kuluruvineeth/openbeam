from __future__ import annotations

import sys
import types
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from engine.common.config import CPUServiceSettings

_fake_browser_use = types.ModuleType("browser_use")
_fake_browser_use.Agent = MagicMock  # type: ignore[attr-defined]
_fake_browser_use.ChatAnthropic = MagicMock  # type: ignore[attr-defined]


@pytest.fixture(autouse=True)
def _inject_browser_use_stub():
    was_present = "browser_use" in sys.modules
    original = sys.modules.get("browser_use")
    sys.modules["browser_use"] = _fake_browser_use
    yield
    if was_present and original is not None:
        sys.modules["browser_use"] = original
    else:
        sys.modules.pop("browser_use", None)


def make_settings(**overrides: object) -> CPUServiceSettings:
    defaults = {
        "enable_browser": True,
        "browser_timeout_seconds": 10,
        "browser_headless": True,
        "browser_max_steps": 50,
        "browser_llm_model": "claude-sonnet-4-5-20250929",
    }
    defaults.update(overrides)
    return CPUServiceSettings(**defaults)  # type: ignore[arg-type]


class TestBrowserServiceInit:
    def test_settings_stored(self):
        from engine.browser.service import BrowserService

        settings = make_settings()
        service = BrowserService(settings)
        assert service._settings.enable_browser is True
        assert service._settings.browser_headless is True

    async def test_initialize_raises_on_missing_deps(self):
        from engine.browser.service import BrowserService

        service = BrowserService(make_settings())
        with patch.dict("sys.modules", {"playwright": None, "playwright.async_api": None}):
            with pytest.raises(ImportError, match="browser deps"):
                await service.initialize()


class TestBrowserServiceRunTask:
    async def test_timeout_returns_timeout_result(self):
        from engine.browser.service import BrowserService

        settings = make_settings(browser_timeout_seconds=0)
        service = BrowserService(settings)
        service._browser = MagicMock()

        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(side_effect=TimeoutError())

        with (
            patch("browser_use.Agent", return_value=mock_agent_instance),
            patch("browser_use.ChatAnthropic"),
        ):
            result = await service.run_task("test task")

        assert result.status == "timeout"
        assert result.error is not None

    async def test_exception_returns_failed_result(self):
        from engine.browser.service import BrowserService

        service = BrowserService(make_settings())
        service._browser = MagicMock()

        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(side_effect=RuntimeError("browser crashed"))

        with (
            patch("browser_use.Agent", return_value=mock_agent_instance),
            patch("browser_use.ChatAnthropic"),
        ):
            result = await service.run_task("test task")

        assert result.status == "failed"
        assert "browser crashed" in (result.error or "")

    async def test_max_steps_capped_by_settings(self):
        from engine.browser.service import BrowserService

        settings = make_settings(browser_max_steps=10)
        service = BrowserService(settings)
        service._browser = MagicMock()

        mock_agent_cls = MagicMock()
        mock_agent_instance = MagicMock()
        mock_agent_instance.run = AsyncMock(return_value=MagicMock(
            history=[], extracted_content="done", final_url=None
        ))
        mock_agent_cls.return_value = mock_agent_instance

        with (
            patch("browser_use.Agent", mock_agent_cls),
            patch("browser_use.ChatAnthropic"),
        ):
            await service.run_task("test", max_steps=100)

        call_kwargs = mock_agent_cls.call_args
        assert call_kwargs.kwargs["max_steps"] == 10


class TestBrowserServiceClose:
    async def test_close_cleans_up(self):
        from engine.browser.service import BrowserService

        service = BrowserService(make_settings())
        service._browser = AsyncMock()
        service._playwright = AsyncMock()

        await service.close()

        service._browser.close.assert_called_once()
        service._playwright.stop.assert_called_once()

    async def test_close_handles_none(self):
        from engine.browser.service import BrowserService

        service = BrowserService(make_settings())
        await service.close()
