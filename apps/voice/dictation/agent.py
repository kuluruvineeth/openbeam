import json

from livekit.agents import Agent, RunContext, function_tool
from livekit.agents.voice import AgentSession as VoiceSession
from livekit.plugins import deepgram, openai as openai_plugin, silero

from common.logging import get_logger
from dictation.dictionary import CUSTOM_KEYWORDS
from telemetry import VoiceMetricsCollector

logger = get_logger("voice.dictation")

DICTATION_INSTRUCTIONS = """<role>
You are a dictation formatting engine. You receive raw speech transcriptions
and output clean, formatted text ready for insertion into the user's active field.
</role>

<rules>
- Fix grammar, punctuation, and capitalization
- Preserve the speaker's intended meaning exactly
- Handle verbal commands: "new line", "new paragraph", "period", "comma",
  "question mark", "exclamation point", "colon", "semicolon", "open quote",
  "close quote", "open paren", "close paren"
- "Delete last word" removes the most recent word
- "Delete last sentence" removes the most recent sentence
- "Select all" and "undo" are passed through as control signals
- Never add content the speaker didn't say
- Never summarize or paraphrase
- Output ONLY the formatted text, no explanations
</rules>

<context_awareness>
You may receive context about the active application and text field.
Use this to match formatting conventions:
- Code editor: preserve variable names, use code formatting
- Email: professional tone, proper salutation/closing
- Chat: casual, preserve emoji references
- Search bar: concise query formatting
</context_awareness>"""


class DictationAgent(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=DICTATION_INSTRUCTIONS)
        self._buffer: list[str] = []
        self._context: dict[str, str] = {}

    async def on_enter(self) -> None:
        pass

    @function_tool()
    async def set_context(
        self,
        ctx: RunContext,
        app_name: str,
        field_type: str,
        existing_text: str = "",
    ) -> str:
        """Set the current application context for formatting."""
        self._context = {
            "app": app_name,
            "field": field_type,
            "existing": existing_text,
        }
        return f"Context set: {app_name}/{field_type}"

    @function_tool()
    async def get_buffer(self, ctx: RunContext) -> str:
        """Get the current dictation buffer."""
        return " ".join(self._buffer)


async def entrypoint(ctx: object) -> None:
    session = VoiceSession(
        stt=deepgram.STT(
            model="nova-3",
            language="multi",
            smart_format=True,
            filler_words=False,
            punctuate=True,
            keywords=CUSTOM_KEYWORDS,
        ),
        llm=openai_plugin.LLM(model="gpt-4.1-mini"),
        vad=silero.VAD.load(
            activation_threshold=0.4,
            min_silence_duration=0.5,
            prefix_padding_duration=0.3,
        ),
        turn_detection=None,
        tts=None,
        min_endpointing_delay=0.6,
    )

    agent = DictationAgent()
    metrics = VoiceMetricsCollector(session, "dictation")

    logger.info("dictation_agent_starting", room_id=getattr(ctx, "room", None) and ctx.room.name)

    session.on("agent_speech_committed", lambda ev: _emit_text(ctx, ev))

    try:
        await session.start(agent=agent, room=ctx.room)
    finally:
        metrics.close()


async def _emit_text(ctx: object, event: object) -> None:
    text = getattr(event, "content", "")
    if not text:
        return

    data = json.dumps({
        "type": "dictation_text",
        "text": text,
        "final": True,
    }).encode()

    await ctx.room.local_participant.publish_data(
        payload=data,
        reliable=True,
        topic="dictation",
    )
