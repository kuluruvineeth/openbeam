import "dotenv/config";
import db from "@openbeam/db";
import { env } from "./env";
import { stopCleanup } from "./lib/rate-limit";
import { createBotRoutes } from "./routes";

const app = createBotRoutes();

export { app };

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: env.BOT_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
});

const SHUTDOWN_TIMEOUT_MS = 10_000;

function shutdown(): void {
  const timer = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  stopCleanup();
  server.stop();
  db.$disconnect().finally(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log(`Bot server running on ${server.hostname}:${server.port}`);
