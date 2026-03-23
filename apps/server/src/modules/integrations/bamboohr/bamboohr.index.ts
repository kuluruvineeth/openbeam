import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./bamboohr.handlers";
import { apiKeyAuthRoute } from "./bamboohr.routes";

const bamboohr = new OpenAPIHono<AuthEnv>();

bamboohr.use("/auth", requireAuth);
bamboohr.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default bamboohr;
