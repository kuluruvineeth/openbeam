import type { Hono } from "hono";
import { handleWhatsAppVerification, whatsappAdapter } from "../adapters";
import { extractHeaders, standardWebhook } from "./shared";

export function registerWhatsAppRoutes(routes: Hono): void {
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
}
