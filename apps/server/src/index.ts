import "./instrumentation";
import "dotenv/config";
import { createTRPCContext } from "@openbeam/api/context";
import { appRouter } from "@openbeam/api/routers/index";
import { initializeAI } from "@openbeam/services";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { configureOpenAPI } from "@/lib/configure-open-api";
import { createApp } from "@/lib/create-app";
import authRouter from "@/modules/auth/auth.index";
import { mapRoutes } from "@/routes/index";
import logger from "@/utils/logger";

initializeAI({ enableMetrics: true });

const app = createApp();

app.route("/api/auth", authRouter);

mapRoutes(app);

configureOpenAPI(app);

app.all("/trpc/*", async (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    router: appRouter,
    req: c.req.raw,
    createContext: () => createTRPCContext({ context: c }),
  })
);

app.all("/mcp", async (c) => {
  const { handleMcpRequest } = await import(
    "./modules/mcp/mcp.streamable-http"
  );
  return handleMcpRequest(c);
});

app.get("/", (c) => c.text("OK"));

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: 120,
});

logger.info(
  { port: server.port },
  `Server running on http://localhost:${server.port}`
);
