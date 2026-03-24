import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./benchling.handlers";
import { apiKeyAuthRoute } from "./benchling.routes";

const benchling = new OpenAPIHono<AuthEnv>();

benchling.use("/auth", requireAuth);
benchling.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default benchling;
