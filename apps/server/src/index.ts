// IMPORTANT: instrumentation must be imported FIRST to properly instrument modules
import "./instrumentation";
import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createTRPCContext } from "@openplane/api/context";
import { appRouter } from "@openplane/api/routers/index";
import { auth } from "@openplane/auth";
import { configureOpenAPI } from "@/lib/configure-open-api";
import { createApp } from "@/lib/create-app";
import { mapRoutes } from "@/routes/index";

const app = createApp();

// Auth API
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Application Routes
mapRoutes(app);

// Configure OpenAPI (Swagger/Scalar)
configureOpenAPI(app);

// tRPC API
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => createTRPCContext({ context }),
  })
);

app.get("/", (c) => c.text("OK"));

export default app;
