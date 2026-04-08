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

async function shutdown(): Promise<void> {
  const timer = setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS);
  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  stopCleanup();
  await server.stop();
  await db.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => {
  shutdown();
});
process.on("SIGINT", () => {
  shutdown();
});
process.on("uncaughtException", (error) => {
  console.error("uncaught exception", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("unhandled rejection", reason);
  process.exit(1);
});

console.log(`Bot server running on ${server.hostname}:${server.port}`);
