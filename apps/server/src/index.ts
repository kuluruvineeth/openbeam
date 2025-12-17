import "./instrumentation";
import "dotenv/config";
import { createTRPCContext } from "@openplane/api/context";
import { appRouter } from "@openplane/api/routers/index";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { configureOpenAPI } from "@/lib/configure-open-api";
import { createApp } from "@/lib/create-app";
import authRouter from "@/modules/auth/auth.index";
import { mapRoutes } from "@/routes/index";

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

export default app;
