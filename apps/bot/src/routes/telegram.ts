import type { Hono } from "hono";
import { telegramAdapter } from "../adapters";
import { extractHeaders, standardWebhook } from "./shared";

export function registerTelegramRoutes(routes: Hono): void {
  routes.post("/webhooks/telegram", async (c) => {
    const rawBody = await c.req.text();
    const headers = extractHeaders(c.req.raw.headers);
    const result = await standardWebhook(telegramAdapter, rawBody, headers);
    return c.json({ ok: result.ok, error: result.error }, result.status as 200);
  });
}
