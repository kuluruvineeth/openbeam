import type { RouteHandler } from "@hono/zod-openapi";
import {
  connectorRegistry,
  exchangeGoogleCode,
  exchangeSlackCode,
  // Google
  generateGoogleAuthUrl,
  // Slack
  generateSlackAuthUrl,
  generateStateToken,
  getConnector,
  getGoogleCredentials,
  getSlackCredentials,
} from "@openplane/connectors";
import type { initiateOAuth, oauthCallback } from "./oauth.routes";

/**
 * Get OAuth functions for a provider
 */
function getProviderOAuth(provider: string) {
  switch (provider.toLowerCase()) {
    case "slack":
      return {
        getCredentials: getSlackCredentials,
        generateAuthUrl: (params: {
          credentials: { clientId: string; clientSecret: string };
          redirectUri: string;
          state: string;
          scopes?: string[];
        }) =>
          generateSlackAuthUrl({
            credentials: params.credentials,
            redirectUri: params.redirectUri,
            state: params.state,
            scopes: params.scopes,
          }),
        exchangeCode: exchangeSlackCode,
      };
    case "google":
      return {
        getCredentials: getGoogleCredentials,
        generateAuthUrl: (params: {
          credentials: { clientId: string; clientSecret: string };
          redirectUri: string;
          state: string;
          scopes?: string[];
        }) =>
          generateGoogleAuthUrl({
            credentials: params.credentials,
            redirectUri: params.redirectUri,
            state: params.state,
            scopes: params.scopes,
          }),
        exchangeCode: exchangeGoogleCode,
      };
    default:
      return null;
  }
}

/**
 * Handle OAuth initiation
 */
export const initiateOAuthHandler: RouteHandler<typeof initiateOAuth> = async (
  c
) => {
  const { provider } = c.req.valid("param");
  const body = c.req.valid("json");

  // Check if connector exists
  const connector = getConnector(provider);
  if (!connector) {
    const available = Object.keys(connectorRegistry).join(", ");
    return c.json(
      {
        error: "unsupported_provider",
        error_description: `Provider '${provider}' is not supported. Available: ${available}`,
      },
      400
    );
  }

  // Get provider-specific OAuth functions
  const oauth = getProviderOAuth(provider);
  if (!oauth) {
    return c.json(
      {
        error: "oauth_not_implemented",
        error_description: `OAuth is not yet implemented for ${connector.name}`,
      },
      400
    );
  }

  // Check credentials
  const credentials = oauth.getCredentials();
  if (!credentials) {
    return c.json(
      {
        error: "provider_not_configured",
        error_description: `${connector.name} OAuth is not configured. Check environment variables.`,
      },
      400
    );
  }

  // Generate state token
  const state = generateStateToken();

  // Build redirect URI
  const baseUrl = process.env.SERVER_URL || "http://localhost:3001";
  const redirectUri = `${baseUrl}/api/v1/connectors/oauth/${provider}/callback`;

  // Generate auth URL
  const result = oauth.generateAuthUrl({
    credentials,
    redirectUri,
    state,
    scopes: body.scopes,
  });

  // TODO: Store state in Redis for validation
  // await redis.set(`oauth:state:${state}`, { provider, teamId }, 'EX', 600);

  return c.json({
    authUrl: result.url,
    state: result.state,
  });
};

/**
 * Handle OAuth callback
 */
export const oauthCallbackHandler: RouteHandler<typeof oauthCallback> = async (
  c
) => {
  const { provider } = c.req.valid("param");
  const { code, error, error_description } = c.req.valid("query");

  // Handle OAuth errors from provider
  if (error) {
    return c.json(
      {
        error,
        error_description: error_description || "Authorization was denied",
      },
      400
    );
  }

  if (!code) {
    return c.json(
      {
        error: "missing_code",
        error_description: "No authorization code received",
      },
      400
    );
  }

  // Get connector and OAuth functions
  const connector = getConnector(provider);
  const oauth = getProviderOAuth(provider);

  if (!(connector && oauth)) {
    return c.json(
      {
        error: "unsupported_provider",
        error_description: `Provider '${provider}' is not supported`,
      },
      400
    );
  }

  const credentials = oauth.getCredentials();
  if (!credentials) {
    return c.json(
      {
        error: "provider_not_configured",
        error_description: `${connector.name} OAuth is not configured`,
      },
      400
    );
  }

  // Build redirect URI (must match initiate)
  const baseUrl = process.env.SERVER_URL || "http://localhost:3001";
  const redirectUri = `${baseUrl}/api/v1/connectors/oauth/${provider}/callback`;

  try {
    // Exchange code for tokens using provider-specific function
    const result = await oauth.exchangeCode({
      credentials,
      code,
      redirectUri,
    });

    // TODO: Create connector in database with tokens
    // const connector = await createConnector({
    //   teamId: storedState.teamId,
    //   provider,
    //   accessToken: result.accessToken,
    //   refreshToken: result.refreshToken,
    //   ...
    // });

    const connectorId = `${provider}_${Date.now()}`;

    return c.json({
      success: true,
      connectorId,
      message: `Successfully connected to ${connector.name}`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token exchange failed";
    return c.json(
      {
        error: "token_exchange_failed",
        error_description: message,
      },
      400
    );
  }
};
