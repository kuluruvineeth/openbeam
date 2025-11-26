import { OpenAPIHono } from "@hono/zod-openapi";
import type { AuthEnv } from "@/middleware/auth";
import { initiateOAuthHandler, oauthCallbackHandler } from "./oauth.handlers";
import { initiateOAuth, oauthCallback } from "./oauth.routes";

const oauth = new OpenAPIHono<AuthEnv>();

/**
 * OAuth Initiation
 * POST /api/v1/connectors/oauth/{provider}/initiate
 *
 * Requires authentication - user must be logged in to connect a service
 */
oauth.openapi(initiateOAuth, initiateOAuthHandler);

/**
 * OAuth Callback
 * GET /api/v1/connectors/oauth/{provider}/callback
 *
 * No authentication required - this is the redirect from the OAuth provider
 * State token is used for CSRF protection instead
 */
oauth.openapi(oauthCallback, oauthCallbackHandler);

export default oauth;
