import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./simpplr.handlers";
import { apiKeyAuthRoute } from "./simpplr.routes";

const simpplr = new OpenAPIHono<AuthEnv>();

simpplr.use("/auth", requireAuth);
simpplr.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default simpplr;
