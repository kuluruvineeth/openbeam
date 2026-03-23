import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./freshservice.handlers";
import { apiKeyAuthRoute } from "./freshservice.routes";

const freshservice = new OpenAPIHono<AuthEnv>();

freshservice.use("/auth", requireAuth);
freshservice.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default freshservice;
