import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import db, {
  exchangeAuthorizationCode,
  refreshOAuthAccessToken,
} from "@openbeam/db";

const ERROR_MAP: Record<string, string> = {
  "Invalid authorization code": "invalid_grant",
  "Authorization code expired": "invalid_grant",
  "Authorization code already used": "invalid_grant",
  "Invalid client credentials": "invalid_client",
  "Invalid code verifier": "invalid_grant",
  "Redirect URI mismatch": "invalid_grant",
  "Invalid refresh token": "invalid_grant",
  "Refresh token expired": "invalid_grant",
  "Refresh token revoked": "invalid_grant",
  "Application is inactive": "invalid_client",
};

function mapOAuthError(message: string): { error: string; status: number } {
  const error = ERROR_MAP[message] ?? "server_error";
  const status = error === "server_error" ? 500 : 400;
  return { error, status };
}

const oauthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal("Bearer"),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

const tokenRoute = createRoute({
  method: "post",
  path: "/oauth/token",
  tags: ["OAuth"],
  responses: {
    200: {
      description: "Token issued",
      content: { "application/json": { schema: tokenResponseSchema } },
    },
    400: {
      description: "OAuth error",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
    500: {
      description: "Server error",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
  },
});

async function parseBody(req: Request): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await req.json()) as Record<string, string>;
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  try {
    return (await req.json()) as Record<string, string>;
  } catch {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }
}

const router = new OpenAPIHono();

router.openapi(tokenRoute, async (c) => {
  const body = await parseBody(c.req.raw.clone());
  const grantType = body.grant_type;

  if (grantType === "authorization_code") {
    const { code, redirect_uri, client_id, client_secret, code_verifier } =
      body;

    if (!(code && redirect_uri && client_id)) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "Missing required parameters",
        },
        400
      );
    }

    try {
      const result = await exchangeAuthorizationCode(db, {
        code,
        redirectUri: redirect_uri,
        clientId: client_id,
        clientSecret: client_secret,
        codeVerifier: code_verifier,
      });

      return c.json(
        {
          access_token: result.accessToken,
          token_type: result.tokenType,
          expires_in: result.expiresIn,
          refresh_token: result.refreshToken,
          scope: result.scope,
        },
        200
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const { error, status } = mapOAuthError(message);
      return c.json({ error, error_description: message }, status as 400 | 500);
    }
  }

  if (grantType === "refresh_token") {
    const { refresh_token, client_id, client_secret, scope } = body;

    if (!(refresh_token && client_id)) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "Missing required parameters",
        },
        400
      );
    }

    try {
      const result = await refreshOAuthAccessToken(db, {
        refreshToken: refresh_token,
        clientId: client_id,
        clientSecret: client_secret,
        scope,
      });

      return c.json(
        {
          access_token: result.accessToken,
          token_type: result.tokenType,
          expires_in: result.expiresIn,
          refresh_token: result.refreshToken,
          scope: result.scope,
        },
        200
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      const { error, status } = mapOAuthError(message);
      return c.json({ error, error_description: message }, status as 400 | 500);
    }
  }

  return c.json(
    {
      error: "unsupported_grant_type",
      error_description: `Grant type "${grantType}" is not supported`,
    },
    400
  );
});

export default router;
