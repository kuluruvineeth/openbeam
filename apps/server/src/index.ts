import "./instrumentation";
import "dotenv/config";
import { createTRPCContext } from "@openplane/api/context";
import { appRouter } from "@openplane/api/routers/index";
import { initializeAI } from "@openplane/services";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { configureOpenAPI } from "@/lib/configure-open-api";
import { createApp } from "@/lib/create-app";
import authRouter from "@/modules/auth/auth.index";
import { mapRoutes } from "@/routes/index";

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

app.get("/", (c) => c.text("OK"));

const port = Number(process.env.PORT) || 3000;

const server = Bun.serve({
  port,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`Server running on http://localhost:${server.port}`);
