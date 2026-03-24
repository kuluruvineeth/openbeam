import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./fifteen-five.handlers";
import { apiKeyAuthRoute } from "./fifteen-five.routes";

const fifteenFive = new OpenAPIHono<AuthEnv>();

fifteenFive.use("/auth", requireAuth);
fifteenFive.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default fifteenFive;
