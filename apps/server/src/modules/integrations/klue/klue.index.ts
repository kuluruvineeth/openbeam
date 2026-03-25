import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./klue.handlers";
import { apiKeyAuthRoute } from "./klue.routes";

const klue = new OpenAPIHono<AuthEnv>();

klue.use("/auth", requireAuth);
klue.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default klue;
