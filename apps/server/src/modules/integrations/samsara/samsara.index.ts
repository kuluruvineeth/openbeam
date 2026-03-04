import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler, webhookHandler } from "./samsara.handlers";
import { apiKeyAuthRoute, webhookRoute } from "./samsara.routes";

const samsara = new OpenAPIHono<AuthEnv>();

samsara.use("/auth", requireAuth);
samsara.openapi(apiKeyAuthRoute, apiKeyAuthHandler);
samsara.openapi(webhookRoute, webhookHandler);

export default samsara;
