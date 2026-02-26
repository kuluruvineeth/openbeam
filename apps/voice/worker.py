import json
import os

from livekit.agents import AgentServer, WorkerOptions, WorkerType

from common.logging import configure_logging, get_logger
from dictation.agent import entrypoint as dictation_entrypoint
from action.agent import entrypoint as action_entrypoint
from telemetry import start_metrics_server

logger = get_logger("voice.worker")


def prewarm(proc: object) -> None:
    from livekit.plugins import deepgram, silero

    deepgram.STT.prewarm()
    silero.VAD.load()


async def request_handler(ctx: object) -> None:
    room_meta = json.loads(ctx.room.metadata or "{}")
    room_type = room_meta.get("roomType", "action")

    logger.info("agent_dispatching", room_type=room_type, room_id=ctx.room.name)

    if room_type == "dictation":
        await dictation_entrypoint(ctx)
    else:
        await action_entrypoint(ctx)


if __name__ == "__main__":
    env = os.getenv("ENVIRONMENT", "development")
    configure_logging(env)
    start_metrics_server(port=9092)
    logger.info("voice_worker_starting", env=env, metrics_port=9092)

    server = AgentServer(
        WorkerOptions(
            entrypoint_fnc=request_handler,
            prewarm_fnc=prewarm,
            worker_type=WorkerType.ROOM,
            max_retry=3,
            num_idle_processes=2,
        )
    )
    server.run()
