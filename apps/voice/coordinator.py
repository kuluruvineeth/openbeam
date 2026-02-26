from livekit.agents import Agent, RunContext, function_tool

from common.logging import get_logger

logger = get_logger("voice.coordinator")


class CoordinatorAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are a voice coordinator. Route requests:
- Dictation requests → DictationAgent
- Search queries → ActionAgent (with search tool)
- General questions → ActionAgent
- System commands → ActionAgent"""
        )

    @function_tool()
    async def transfer_to_dictation(self, ctx: RunContext) -> tuple:
        """Switch to dictation mode for typing text."""
        from dictation.agent import DictationAgent

        logger.info("transferring_to_dictation")
        return DictationAgent(), "Switching to dictation."

    @function_tool()
    async def transfer_to_action(self, ctx: RunContext) -> tuple:
        """Switch to action agent for command execution."""
        from action.agent import ActionAgent

        logger.info("transferring_to_action")
        return ActionAgent(), "Ready for commands."
