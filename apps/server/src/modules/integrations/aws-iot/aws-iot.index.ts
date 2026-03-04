import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./aws-iot.handlers";
import { apiKeyAuthRoute } from "./aws-iot.routes";

const awsIot = new OpenAPIHono<AuthEnv>();

awsIot.use("/auth", requireAuth);
awsIot.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default awsIot;
