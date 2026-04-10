import type { Hono } from "hono";
import { teamsAdapter } from "../adapters";
import { resolveAndRoute } from "./shared";

export function registerTeamsRoutes(routes: Hono): void {
  routes.post("/webhooks/teams", async (c) => {
    try {
      const rawBody = await c.req.text();
      const headers = Object.fromEntries(c.req.raw.headers.entries());
      await teamsAdapter.processActivity(rawBody, headers, async (message) => {
        const response = await resolveAndRoute(teamsAdapter, message);
        if (response) {
          await teamsAdapter.sendResponse(message, response);
        }
      });
      return c.json({ ok: true });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "internal error";
      return c.json({ ok: false, error: msg }, 500);
    }
  });
}
