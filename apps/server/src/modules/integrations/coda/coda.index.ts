import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./coda.handlers";
import { apiKeyAuthRoute } from "./coda.routes";

const coda = new OpenAPIHono<AuthEnv>();

coda.use("/auth", requireAuth);
coda.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default coda;
