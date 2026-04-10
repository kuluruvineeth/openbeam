import { Hono } from "hono";
import { registerDiscordRoutes } from "./routes/discord";
import { registerSlackRoutes } from "./routes/slack";
import { registerTeamsRoutes } from "./routes/teams";
import { registerTelegramRoutes } from "./routes/telegram";
import { registerWhatsAppRoutes } from "./routes/whatsapp";

export function createBotRoutes(): Hono {
  const routes = new Hono();

  routes.onError((error, c) => {
    console.error("unhandled route error", error);
    return c.json({ ok: false, error: "internal error" }, 500);
  });

  registerSlackRoutes(routes);
  registerTeamsRoutes(routes);
  registerDiscordRoutes(routes);
  registerTelegramRoutes(routes);
  registerWhatsAppRoutes(routes);

  routes.get("/health", (c) => c.json({ status: "ok", service: "bot" }));

  return routes;
}
