import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { callbackHandler, startAuthHandler } from "./workday.handlers";
import { callbackRoute, startAuthRoute } from "./workday.routes";

const workday = new OpenAPIHono<AuthEnv>();

workday.use("/auth/*", requireAuth);
workday.openapi(startAuthRoute, startAuthHandler);
workday.openapi(callbackRoute, callbackHandler);

export default workday;
