import "./instrumentation";
import "dotenv/config";
import { createTRPCContext } from "@openplane/api/context";
import { appRouter } from "@openplane/api/routers/index";
import { auth } from "@openplane/auth";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { configureOpenAPI } from "@/lib/configure-open-api";
import { createApp } from "@/lib/create-app";
import { mapRoutes } from "@/routes/index";

const app = createApp();

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

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

export default app;
