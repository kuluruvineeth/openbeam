import { createRoute } from "@hono/zod-openapi";
import {
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthErrorSchema,
  oauthInitiateBodySchema,
  oauthInitiateResponseSchema,
  oauthProviderParamSchema,
} from "./oauth.schema";

const tags = ["OAuth"];

/**
 * Initiate OAuth flow
 * Returns the authorization URL to redirect the user to
 */
export const initiateOAuth = createRoute({
  tags,
  method: "post",
  path: "/{provider}/initiate",
  summary: "Initiate OAuth flow",
  description:
    "Start the OAuth authorization flow for a connector provider. Returns the URL to redirect the user to.",
  request: {
    params: oauthProviderParamSchema,
    body: {
      content: {
        "application/json": {
          schema: oauthInitiateBodySchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: oauthInitiateResponseSchema,
        },
      },
      description: "OAuth authorization URL generated",
    },
    400: {
      content: { "application/json": { schema: oauthErrorSchema } },
      description: "Invalid provider or configuration",
    },
  },
});

/**
 * OAuth callback handler
 * Receives the authorization code from the provider and exchanges it for tokens
 */
export const oauthCallback = createRoute({
  tags,
  method: "get",
  path: "/{provider}/callback",
  summary: "OAuth callback",
  description:
    "Handle the OAuth callback from the provider. Exchanges the authorization code for tokens and creates/updates the connector.",
  request: {
    params: oauthProviderParamSchema,
    query: oauthCallbackQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: oauthCallbackResponseSchema,
        },
      },
      description: "OAuth completed successfully",
    },
    400: {
      content: { "application/json": { schema: oauthErrorSchema } },
      description: "OAuth error or invalid code",
    },
  },
});
