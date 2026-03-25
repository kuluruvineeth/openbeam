import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./jenkins.handlers";
import { apiKeyAuthRoute } from "./jenkins.routes";

const jenkins = new OpenAPIHono<AuthEnv>();

jenkins.use("/auth", requireAuth);
jenkins.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default jenkins;
