import { InteractionType } from "discord-api-types/v10";
import type { Hono } from "hono";
import { DISCORD_PING_RESPONSE, discordAdapter } from "../adapters";
import { extractHeaders, resolveAndRoute } from "./shared";

export function registerDiscordRoutes(routes: Hono): void {
  routes.post("/webhooks/discord", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);

    if (!(await discordAdapter.verifySignature(rawBody, headers))) {
      return c.json({ error: "invalid signature" }, 401);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }

    if (parsed.type === InteractionType.Ping) {
      return c.json(DISCORD_PING_RESPONSE);
    }

    const message = await discordAdapter.parseEvent(parsed, headers);
    if (!message) {
      return c.json({ ok: true });
    }

    const response = await resolveAndRoute(discordAdapter, message);
    if (response) {
      await discordAdapter.sendResponse(message, response);
    }

    return c.json({ ok: true });
  });
}
