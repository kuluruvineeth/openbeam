import { z } from "@hono/zod-openapi";

// Provider parameter
export const oauthProviderParamSchema = z.object({
  provider: z.string().openapi({
    param: { name: "provider", in: "path" },
    description: "OAuth provider name (google, slack, notion, etc.)",
    example: "google",
  }),
});

// OAuth callback query parameters (from provider redirect)
export const oauthCallbackQuerySchema = z.object({
  code: z.string().openapi({
    description: "Authorization code from OAuth provider",
  }),
  state: z.string().optional().openapi({
    description: "State parameter for CSRF protection",
  }),
  error: z.string().optional().openapi({
    description: "Error code if authorization failed",
  }),
  error_description: z.string().optional().openapi({
    description: "Human-readable error description",
  }),
});

// OAuth initiate request body
export const oauthInitiateBodySchema = z.object({
  redirectUrl: z.string().url().optional().openapi({
    description: "Custom redirect URL after OAuth completion",
  }),
  scopes: z.array(z.string()).optional().openapi({
    description: "Additional OAuth scopes to request",
  }),
});

// OAuth initiate response
export const oauthInitiateResponseSchema = z.object({
  authUrl: z.string().url().openapi({
    description: "URL to redirect user to for OAuth authorization",
  }),
  state: z.string().openapi({
    description: "State token for CSRF protection",
  }),
});

// OAuth callback response
export const oauthCallbackResponseSchema = z.object({
  success: z.boolean(),
  connectorId: z.string().optional().openapi({
    description: "ID of created/updated connector",
  }),
  message: z.string().optional(),
});

// Error response
export const oauthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

// Provider configuration type
export type OAuthProviderConfig = {
  name: string;
  authUrl: string;
  tokenUrl: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  defaultScopes: string[];
};
