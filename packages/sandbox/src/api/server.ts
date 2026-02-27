import { Hono } from "hono";
import { requireSandboxAuth, type SandboxAuthVariables } from "./auth";
import { sandboxRateLimit } from "./rate-limit";
import { execRoutes } from "./routes/exec";
import { fileRoutes } from "./routes/files";
import { sandboxRoutes } from "./routes/sandbox";

export function createSandboxApi() {
  const app = new Hono<{ Variables: SandboxAuthVariables }>();

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.use("*", requireSandboxAuth);
  app.use("*", sandboxRateLimit);

  app.route("/", sandboxRoutes());
  app.route("/", fileRoutes());
  app.route("/", execRoutes());

  return app;
}

export type SandboxApi = ReturnType<typeof createSandboxApi>;
