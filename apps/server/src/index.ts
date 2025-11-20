import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createTRPCContext } from "@openplane/api/context";
import { appRouter } from "@openplane/api/routers/index";
import { auth } from "@openplane/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { type AuthEnv, sessionMiddleware } from "./middleware/auth";
import { mapRoutes } from "./routes/index";

const app = new Hono<AuthEnv>();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: [
      process.env.CORS_ORIGIN || "",
      "https://new-sculpin-illegally.ngrok-free.app",
      "http://localhost:3001",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Global session middleware
app.use("*", sessionMiddleware);

// Auth API
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Application Routes
mapRoutes(app);

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
