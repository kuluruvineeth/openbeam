import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth } from "@/middleware/auth";
import { apiKeyAuthHandler } from "./evernote.handlers";
import { apiKeyAuthRoute } from "./evernote.routes";

const evernote = new OpenAPIHono<AuthEnv>();

evernote.use("/auth", requireAuth);
evernote.openapi(apiKeyAuthRoute, apiKeyAuthHandler);

export default evernote;
