import { OpenAPIHono } from "@hono/zod-openapi";
import { type AuthEnv, requireAuth, requireScopes } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";
import { submitExtensionChatHandler } from "./extensions.handlers";
import { submitExtensionChatRoute } from "./extensions.routes";

const extensions = new OpenAPIHono<AuthEnv>();

extensions.use("/*", requireAuth);
extensions.use("/*", requireScopes([API_SCOPES.AGENTS_WRITE]));

extensions.openapi(submitExtensionChatRoute, submitExtensionChatHandler);

export default extensions;
