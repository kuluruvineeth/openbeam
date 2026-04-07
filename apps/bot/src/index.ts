import "dotenv/config";
import db from "@openbeam/db";
import type { PlatformAdapter } from "@openbeam/types/bot";
import { Hono } from "hono";
import { env } from "./env";
import { routeMessage } from "./handlers/router";
import { sendLinkPrompt } from "./identity/linking";
import { resolveIdentity } from "./identity/resolver";
import { checkTeamRateLimit, checkUserRateLimit } from "./lib/rate-limit";

const app = new Hono();

function createWebhookRoute(adapter: PlatformAdapter) {
  return async (c: {
    req: { text: () => Promise<string>; raw: { headers: Headers } };
    json: (body: unknown, status?: number) => Response;
  }) => {
    const rawBody = await c.req.text();
    const headers = Object.fromEntries(c.req.raw.headers.entries());

    if (!adapter.verifySignature(rawBody, headers)) {
      return c.json({ error: "invalid signature" }, 401);
    }

    const parsed = JSON.parse(rawBody);
    const message = await adapter.parseEvent(parsed, headers);
    if (!message) {
      return c.json({ ok: true });
    }

    if (!checkUserRateLimit(message.platform, message.platformUserId)) {
      return c.json({ error: "rate limited" }, 429);
    }

    const identity = await resolveIdentity(db, message);

    if (!identity) {
      await sendLinkPrompt(db, adapter, message);
      return c.json({ ok: true });
    }

    if (!checkTeamRateLimit(identity.teamId)) {
      return c.json({ error: "rate limited" }, 429);
    }

    await adapter.sendTypingIndicator(message.channelId, message.threadId);
    const response = await routeMessage(message, identity);
    await adapter.sendResponse(message, response);

    return c.json({ ok: true });
  };
}

app.get("/health", (c) => c.json({ status: "ok", service: "bot" }));

export { app, createWebhookRoute };

const server = Bun.serve({
  port: env.BOT_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`Bot server running on port ${server.port}`);
