import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./lumapps.handlers";
import { apiKeyAuthRoute } from "./lumapps.routes";

const lumapps = new OpenAPIHono<AuthEnv>();

lumapps.use("/auth", requireAuth);
lumapps.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default lumapps;
