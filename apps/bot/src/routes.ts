import db from "@openbeam/db";
import type {
  BotResponse,
  PlatformAdapter,
  UnifiedMessage,
} from "@openbeam/types/bot";
import { InteractionType } from "discord-api-types/v10";
import { Hono } from "hono";
import {
  DISCORD_PING_RESPONSE,
  discordAdapter,
  handleWhatsAppVerification,
  slackAdapter,
  teamsAdapter,
  telegramAdapter,
  whatsappAdapter,
} from "./adapters";
import { routeMessage } from "./handlers/router";
import { sendLinkPrompt } from "./identity/linking";
import { resolveIdentity } from "./identity/resolver";
import { checkTeamRateLimit, checkUserRateLimit } from "./lib/rate-limit";

async function resolveAndRoute(
  adapter: PlatformAdapter,
  message: UnifiedMessage
): Promise<BotResponse | null> {
  const userLimit = checkUserRateLimit(
    message.platform,
    message.platformUserId
  );
  if (!userLimit.allowed) {
    return {
      type: "error",
      text: `Too many requests. Try again in ${userLimit.retryAfterSeconds}s.`,
    };
  }

  const identity = await resolveIdentity(db, message);

  if (!identity) {
    await sendLinkPrompt(db, adapter, message);
    return null;
  }

  const teamLimit = checkTeamRateLimit(identity.teamId);
  if (!teamLimit.allowed) {
    return {
      type: "error",
      text: `Too many requests. Try again in ${teamLimit.retryAfterSeconds}s.`,
    };
  }

  await adapter.sendTypingIndicator(
    message.channelId,
    message.threadId,
    message.id
  );

  try {
    return await routeMessage(message, identity);
  } catch (error) {
    console.error("handler error", error);
    return {
      type: "error" as const,
      text: "Something went wrong processing your request. Please try again.",
    };
  }
}

async function standardWebhook(
  adapter: PlatformAdapter,
  rawBody: string,
  headers: Record<string, string>
): Promise<{ ok: boolean; error?: string; status: number }> {
  if (!(await adapter.verifySignature(rawBody, headers))) {
    return { ok: false, error: "invalid signature", status: 401 };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "invalid json", status: 400 };
  }

  const message = await adapter.parseEvent(parsed, headers);
  if (!message) {
    return { ok: true, status: 200 };
  }

  const response = await resolveAndRoute(adapter, message);
  if (response) {
    await adapter.sendResponse(message, response);
  }

  return { ok: true, status: 200 };
}

function extractHeaders(raw: Headers): Record<string, string> {
  return Object.fromEntries(raw.entries());
}

export function createBotRoutes(): Hono {
  const routes = new Hono();

  routes.onError((error, c) => {
    console.error("unhandled route error", error);
    return c.json({ ok: false, error: "internal error" }, 500);
  });

  routes.post("/webhooks/slack", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);
    const result = await standardWebhook(slackAdapter, rawBody, headers);
    return c.json({ ok: result.ok, error: result.error }, result.status as 200);
  });

  routes.post("/webhooks/teams", async (c) => {
    try {
      const rawBody = await c.req.text();
      const headers = extractHeaders(c.req.raw.headers);
      await teamsAdapter.processActivity(rawBody, headers, async (message) => {
        const response = await resolveAndRoute(teamsAdapter, message);
        if (response) {
          await teamsAdapter.sendResponse(message, response);
        }
      });
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "internal error";
      return c.json({ ok: false, error: message }, 500);
    }
  });

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

  routes.post("/webhooks/telegram", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);
    const result = await standardWebhook(telegramAdapter, rawBody, headers);
    return c.json({ ok: result.ok, error: result.error }, result.status as 200);
  });

  routes.get("/webhooks/whatsapp", (c) => {
    const challenge = handleWhatsAppVerification(
      c.req.query("hub.mode") ?? null,
      c.req.query("hub.verify_token") ?? null,
      c.req.query("hub.challenge") ?? null
    );
    if (challenge) {
      return c.text(challenge);
    }
    return c.text("Forbidden", 403);
  });

  routes.post("/webhooks/whatsapp", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);
    const result = await standardWebhook(whatsappAdapter, rawBody, headers);
    return c.json({ ok: result.ok, error: result.error }, result.status as 200);
  });

  routes.get("/health", (c) => c.json({ status: "ok", service: "bot" }));

  return routes;
}
