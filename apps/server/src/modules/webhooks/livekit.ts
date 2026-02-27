import { createHmac, timingSafeEqual } from "node:crypto";
import prisma, { updateVoiceSession } from "@openplane/db";
import { Hono } from "hono";
import logger from "../../utils/logger";

const livekitWebhook = new Hono();

function verifyLiveKitSignature(
  body: string,
  authHeader: string | undefined,
  secret: string
): boolean {
  if (!authHeader) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("base64");

  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

function _extractSessionFromRoom(roomName: string): string | null {
  const parts = roomName.split("-");
  return parts.length >= 3 ? parts.slice(0, -1).join("-") : null;
}

livekitWebhook.post("/events", async (c) => {
  const webhookSecret = process.env.LIVEKIT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.warn("LiveKit webhook secret not configured");
    return c.json({ error: "Webhook not configured" }, 500);
  }

  const body = await c.req.text();
  const authHeader = c.req.header("Authorization");

  if (!verifyLiveKitSignature(body, authHeader, webhookSecret)) {
    logger.warn("LiveKit webhook signature verification failed");
    return c.json({ error: "Invalid signature" }, 403);
  }

  let event: {
    event: string;
    room?: { name?: string; sid?: string };
    participant?: { identity?: string };
  };
  try {
    event = JSON.parse(body);
  } catch {
    logger.warn("Invalid LiveKit webhook payload");
    return c.json({ error: "Invalid payload" }, 400);
  }

  const roomName = event.room?.name;
  const eventType = event.event;

  logger.debug({ eventType, roomName }, "LiveKit webhook received");

  if (!roomName) {
    return c.json({ ok: true });
  }

  switch (eventType) {
    case "room_finished": {
      const sessions = await prisma.voiceSession.findMany({
        where: { roomName, status: "active" },
      });

      for (const session of sessions) {
        const duration = Math.floor(
          (Date.now() - session.startedAt.getTime()) / 1000
        );
        await updateVoiceSession(prisma, session.id, {
          status: "completed",
          endedAt: new Date(),
          duration,
        });
      }

      logger.info(
        { roomName, sessionCount: sessions.length },
        "LiveKit room finished — sessions completed"
      );
      break;
    }

    case "participant_left": {
      const identity = event.participant?.identity;
      if (!identity) {
        break;
      }

      const session = await prisma.voiceSession.findFirst({
        where: { roomName, userId: identity, status: "active" },
      });

      if (session) {
        const duration = Math.floor(
          (Date.now() - session.startedAt.getTime()) / 1000
        );
        await updateVoiceSession(prisma, session.id, {
          status: "completed",
          endedAt: new Date(),
          duration,
        });

        logger.info(
          { roomName, userId: identity, sessionId: session.id },
          "Participant left — session completed"
        );
      }
      break;
    }

    default:
      logger.debug({ eventType, roomName }, "LiveKit event ignored");
  }

  return c.json({ ok: true });
});

livekitWebhook.get("/health", (c) =>
  c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
);

export { livekitWebhook };
