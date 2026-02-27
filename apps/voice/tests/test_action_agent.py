import json

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def mock_ctx():
    ctx = MagicMock()
    ctx.room.local_participant.metadata = json.dumps(
        {"teamId": "team-1", "apiToken": "test-token"}
    )
    ctx.room.local_participant.publish_data = AsyncMock()
    ctx.room.name = "test-room"
    return ctx


@pytest.mark.asyncio
async def test_search_calls_api(mock_ctx):
    from action.agent import ActionAgent

    agent = ActionAgent()

    mock_response = MagicMock()
    mock_response.json.return_value = {"results": [{"title": "Doc 1"}]}
    mock_response.raise_for_status = MagicMock()

    with patch.object(agent._http, "post", return_value=mock_response) as mock_post:
        result = await agent.search(mock_ctx, query="test query", limit=5)
        assert "Doc 1" in result
        mock_post.assert_called_once()


@pytest.mark.asyncio
async def test_navigate_publishes_data(mock_ctx):
    from action.agent import ActionAgent

    agent = ActionAgent()
    await agent.navigate(mock_ctx, destination="/search")
    mock_ctx.room.local_participant.publish_data.assert_called_once()

    call_args = mock_ctx.room.local_participant.publish_data.call_args
    payload = json.loads(call_args.kwargs["payload"])
    assert payload["type"] == "navigate"
    assert payload["destination"] == "/search"


@pytest.mark.asyncio
async def test_sync_connector_calls_api(mock_ctx):
    from action.agent import ActionAgent

    agent = ActionAgent()

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()

    with patch.object(agent._http, "post", return_value=mock_response):
        result = await agent.sync_connector(mock_ctx, connector_name="slack")
        assert "Sync triggered" in result
