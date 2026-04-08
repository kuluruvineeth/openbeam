import "dotenv/config";
import { env } from "./env";
import { createBotRoutes } from "./routes";

const app = createBotRoutes();

export { app };

const server = Bun.serve({
  port: env.BOT_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`Bot server running on port ${server.port}`);
