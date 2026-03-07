import json
import os

import httpx
from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.voice import AgentSession as VoiceSession
from livekit.plugins import cartesia, deepgram, openai as openai_plugin, silero

from common.logging import get_logger
from telemetry import TOOL_CALLS, VoiceMetricsCollector

logger = get_logger("voice.action")

OPENBEAM_API_BASE = os.getenv("OPENBEAM_API_URL", "http://localhost:3000/api/v1")

_shared_http = httpx.AsyncClient(
    base_url=OPENBEAM_API_BASE,
    timeout=30.0,
)

ACTION_INSTRUCTIONS = """<role>
You are OpenBeam's voice action agent. You execute tasks across the platform
using voice commands. You have access to search, connectors, documents, and
workspace tools.
</role>

<capabilities>
- Search across all connected data sources
- Sync connectors on demand
- Query and answer questions using RAG
- Create and manage workspace entries
- Navigate to specific pages or resources
- Execute multi-step workflows
</capabilities>

<behavior>
- Confirm destructive actions before executing
- Provide brief, spoken confirmations after actions complete
- If a command is ambiguous, ask one clarifying question
- Use tools proactively — default to action over description
- Keep responses under 2 sentences for confirmations
</behavior>"""


class ActionAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=ACTION_INSTRUCTIONS)
        self._http = _shared_http

    async def on_enter(self) -> None:
        await self.session.generate_reply(instructions="Say: Ready.")

    @function_tool()
    async def search(
        self,
        ctx: RunContext,
        query: str,
        limit: int = 5,
    ) -> str:
        """Search across all connected enterprise data sources."""
        metadata = _get_metadata(ctx)
        team_id = metadata.get("teamId", "")

        TOOL_CALLS.labels(tool_name="search", status="started").inc()
        try:
            resp = await self._http.post(
                "/search/hybrid",
                json={"query": query, "limit": limit, "teamId": team_id},
                headers={"Authorization": f"Bearer {metadata.get('apiToken', '')}"},
            )
            resp.raise_for_status()
            results = resp.json()
            TOOL_CALLS.labels(tool_name="search", status="success").inc()
            return json.dumps(results.get("results", [])[:limit])
        except httpx.HTTPError as e:
            TOOL_CALLS.labels(tool_name="search", status="error").inc()
            logger.error("search_failed", error=str(e), query=query)
            return f"Search failed: {e}"

    @function_tool()
    async def get_document(
        self,
        ctx: RunContext,
        document_id: str,
    ) -> str:
        """Retrieve a specific document by ID."""
        metadata = _get_metadata(ctx)
        TOOL_CALLS.labels(tool_name="get_document", status="started").inc()
        try:
            resp = await self._http.get(
                f"/documents/{document_id}",
                headers={"Authorization": f"Bearer {metadata.get('apiToken', '')}"},
            )
            resp.raise_for_status()
            TOOL_CALLS.labels(tool_name="get_document", status="success").inc()
            return resp.text
        except httpx.HTTPError as e:
            TOOL_CALLS.labels(tool_name="get_document", status="error").inc()
            return f"Failed to get document: {e}"

    @function_tool()
    async def sync_connector(
        self,
        ctx: RunContext,
        connector_name: str,
    ) -> str:
        """Trigger a sync for a specific connector."""
        metadata = _get_metadata(ctx)
        team_id = metadata.get("teamId", "")

        TOOL_CALLS.labels(tool_name="sync_connector", status="started").inc()
        try:
            resp = await self._http.post(
                "/connectors/sync",
                json={"connectorName": connector_name, "teamId": team_id},
                headers={"Authorization": f"Bearer {metadata.get('apiToken', '')}"},
            )
            resp.raise_for_status()
            TOOL_CALLS.labels(tool_name="sync_connector", status="success").inc()
            return f"Sync triggered for {connector_name}"
        except httpx.HTTPError as e:
            TOOL_CALLS.labels(tool_name="sync_connector", status="error").inc()
            return f"Sync failed: {e}"

    @function_tool()
    async def navigate(
        self,
        ctx: RunContext,
        destination: str,
    ) -> str:
        """Navigate the user to a specific page or resource."""
        data = json.dumps({
            "type": "navigate",
            "destination": destination,
        }).encode()

        await ctx.room.local_participant.publish_data(
            payload=data,
            reliable=True,
            topic="navigation",
        )
        TOOL_CALLS.labels(tool_name="navigate", status="success").inc()
        return f"Navigating to {destination}"

    @function_tool()
    async def answer_question(
        self,
        ctx: RunContext,
        question: str,
    ) -> str:
        """Answer a question using RAG grounding."""
        metadata = _get_metadata(ctx)
        team_id = metadata.get("teamId", "")

        TOOL_CALLS.labels(tool_name="answer_question", status="started").inc()
        try:
            resp = await self._http.post(
                "/rag/answer",
                json={"query": question, "teamId": team_id},
                headers={"Authorization": f"Bearer {metadata.get('apiToken', '')}"},
            )
            resp.raise_for_status()
            TOOL_CALLS.labels(tool_name="answer_question", status="success").inc()
            return resp.json().get("answer", "I couldn't find an answer.")
        except httpx.HTTPError as e:
            TOOL_CALLS.labels(tool_name="answer_question", status="error").inc()
            return f"Failed to answer: {e}"


def _get_metadata(ctx: RunContext) -> dict[str, str]:
    return json.loads(ctx.room.local_participant.metadata or "{}")


async def entrypoint(ctx: object) -> None:
    session = VoiceSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
            smart_format=True,
        ),
        llm=openai_plugin.LLM(model="gpt-4.1"),
        tts=cartesia.TTS(
            model="sonic-3",
            voice="c45bc5ec-dc68-4feb-8829-6e6b2748095d",
            speed=1.1,
        ),
        vad=silero.VAD.load(
            activation_threshold=0.5,
            min_silence_duration=0.7,
        ),
        min_endpointing_delay=0.8,
    )

    metrics = VoiceMetricsCollector(session, "action")
    logger.info("action_agent_starting", room_id=getattr(ctx, "room", None) and ctx.room.name)

    try:
        await session.start(agent=ActionAgent(), room=ctx.room)
    finally:
        metrics.close()
