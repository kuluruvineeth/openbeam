import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./azure-iot.handlers";
import { apiKeyAuthRoute } from "./azure-iot.routes";

const azureIot = new OpenAPIHono<AuthEnv>();

azureIot.use("/auth", requireAuth);
azureIot.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default azureIot;
