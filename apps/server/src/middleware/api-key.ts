import { createMiddleware } from "hono/factory";
import { extractApiKey, verifyApiKey } from "../services/auth-service";
import type { AuthEnv } from "./auth";

/**
 * API Key authentication middleware
 * Verifies API key and sets auth context
 */
export const apiKeyAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const apiKey = extractApiKey(authHeader);

  if (!apiKey) {
    await next();
    return;
  }

  // Verify API key and get auth context
  const authContext = await verifyApiKey(apiKey);

  if (authContext && authContext.type === "apiKey") {
    c.set("authContext", authContext);
  }

  await next();
});
