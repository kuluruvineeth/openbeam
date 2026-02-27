import { OpenAPIHono } from "@hono/zod-openapi";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { type AuthEnv, getTeamId, requireAuth } from "@/middleware/auth";
import { createVoiceToken } from "./token";

const voiceRoomTypeSchema = z.object({
  roomType: z.enum(["dictation", "action", "search"]),
});

const voice = new OpenAPIHono<AuthEnv>();

voice.use("/*", requireAuth);

voice.post("/token", zValidator("json", voiceRoomTypeSchema), async (c) => {
  const { roomType } = c.req.valid("json");

  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const teamId = getTeamId(c);
  if (!teamId) {
    return c.json({ error: "Team ID required" }, 400);
  }

  const token = await createVoiceToken(user.id, teamId, roomType);
  const wsUrl = process.env.LIVEKIT_WS_URL ?? "ws://localhost:7880";

  return c.json({ token, wsUrl });
});

export { voice as voiceRoutes };
