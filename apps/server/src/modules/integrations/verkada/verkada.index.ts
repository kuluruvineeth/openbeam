import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler, webhookHandler } from "./verkada.handlers";
import { apiKeyAuthRoute, webhookRoute } from "./verkada.routes";

const verkada = new OpenAPIHono<AuthEnv>();

verkada.use("/auth", requireAuth);

verkada.openapi(apiKeyAuthRoute, apiKeyAuthHandler);
verkada.openapi(webhookRoute, webhookHandler);

export default verkada;
