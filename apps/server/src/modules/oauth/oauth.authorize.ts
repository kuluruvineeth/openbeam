import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import db, {
  claimDCRApplication,
  createAuthorizationCode,
  findOAuthAppByClientId,
  getTeamMembership,
} from "@openbeam/db";
import { type AuthEnv, sessionMiddleware } from "@/middleware/auth";
import { API_SCOPES } from "@/types/auth";

const VALID_SCOPES: Set<string> = new Set(Object.values(API_SCOPES));

const appInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  website: z.string().nullable(),
  clientId: z.string(),
  scopes: z.array(z.string()),
  redirectUri: z.string(),
  state: z.string(),
});

const oauthErrorSchema = z.object({
  error: z.string(),
  error_description: z.string().optional(),
});

const consentResponseSchema = z.object({
  redirect_url: z.string(),
});

function buildErrorRedirect(
  redirectUri: string,
  error: string,
  description: string,
  state: string
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) {
    url.searchParams.set("state", state);
  }
  return url.toString();
}

function isValidRedirectUri(uri: string): boolean {
  try {
    new URL(uri);
    return true;
  } catch {
    return false;
  }
}

const getAuthorizeRoute = createRoute({
  method: "get",
  path: "/oauth/authorize",
  tags: ["OAuth"],
  responses: {
    200: {
      description: "App info for consent screen",
      content: { "application/json": { schema: appInfoSchema } },
    },
    302: { description: "Redirect with error" },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
  },
});

const postAuthorizeRoute = createRoute({
  method: "post",
  path: "/oauth/authorize",
  tags: ["OAuth"],
  middleware: [sessionMiddleware] as const,
  responses: {
    200: {
      description: "Authorization granted",
      content: { "application/json": { schema: consentResponseSchema } },
    },
    302: { description: "Redirect on deny" },
    400: {
      description: "Invalid request",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
    403: {
      description: "Forbidden",
      content: { "application/json": { schema: oauthErrorSchema } },
    },
  },
});

const router = new OpenAPIHono<AuthEnv>();

router.openapi(getAuthorizeRoute, async (c) => {
  const query = c.req.query();
  const responseType = query.response_type;
  const clientId = query.client_id;
  const redirectUri = query.redirect_uri;
  const scope = query.scope;
  const state = query.state ?? "";
  const codeChallenge = query.code_challenge;
  const codeChallengeMethod = query.code_challenge_method;

  if (!(clientId && redirectUri)) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing client_id or redirect_uri",
      },
      400
    );
  }

  const canRedirect = isValidRedirectUri(redirectUri);

  if (responseType !== "code") {
    if (canRedirect) {
      return c.redirect(
        buildErrorRedirect(
          redirectUri,
          "unsupported_response_type",
          "Only response_type=code is supported",
          state
        )
      );
    }
    return c.json(
      {
        error: "unsupported_response_type",
        error_description: "Only response_type=code is supported",
      },
      400
    );
  }

  const app = await findOAuthAppByClientId(db, clientId);

  if (!app?.active) {
    if (canRedirect) {
      return c.redirect(
        buildErrorRedirect(
          redirectUri,
          "invalid_request",
          "Unknown or inactive client_id",
          state
        )
      );
    }
    return c.json(
      {
        error: "invalid_request",
        error_description: "Unknown or inactive client_id",
      },
      400
    );
  }

  if (!app.redirectUris.includes(redirectUri)) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "redirect_uri not registered for this application",
      },
      400
    );
  }

  if (app.isPublic && !codeChallenge) {
    return c.redirect(
      buildErrorRedirect(
        redirectUri,
        "invalid_request",
        "PKCE code_challenge required for public clients",
        state
      )
    );
  }

  if (codeChallengeMethod && codeChallengeMethod !== "S256") {
    return c.redirect(
      buildErrorRedirect(
        redirectUri,
        "invalid_request",
        "Only S256 code_challenge_method is supported",
        state
      )
    );
  }

  const requestedScopes = scope ? scope.split(" ").filter(Boolean) : [];
  const appHasScopes = app.scopes.length > 0;

  for (const s of requestedScopes) {
    if (!VALID_SCOPES.has(s)) {
      return c.redirect(
        buildErrorRedirect(
          redirectUri,
          "invalid_scope",
          `Unknown scope: ${s}`,
          state
        )
      );
    }
    if (appHasScopes && !app.scopes.includes(s)) {
      return c.redirect(
        buildErrorRedirect(
          redirectUri,
          "invalid_scope",
          `Scope not allowed for this application: ${s}`,
          state
        )
      );
    }
  }

  return c.json(
    {
      id: app.id,
      name: app.name,
      description: app.description,
      logoUrl: app.logoUrl,
      website: app.website,
      clientId: app.clientId,
      scopes: requestedScopes,
      redirectUri,
      state,
    },
    200
  );
});

router.openapi(postAuthorizeRoute, async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        error: "unauthorized",
        error_description: "Authentication required",
      },
      401
    );
  }

  const body = await c.req.json<{
    client_id: string;
    decision: "allow" | "deny";
    scopes: string[];
    redirect_uri: string;
    state: string;
    code_challenge?: string;
    teamId: string;
  }>();

  const {
    client_id: clientId,
    decision,
    scopes,
    redirect_uri: redirectUri,
    state,
    code_challenge: codeChallenge,
    teamId,
  } = body;

  if (!(clientId && decision && scopes && redirectUri && teamId)) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Missing required fields",
      },
      400
    );
  }

  const membership = await getTeamMembership(db, user.id, teamId);

  if (!membership) {
    return c.json(
      {
        error: "forbidden",
        error_description: "User is not a member of the specified team",
      },
      403
    );
  }

  const app = await findOAuthAppByClientId(db, clientId);

  if (!app?.active) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "Unknown or inactive client_id",
      },
      400
    );
  }

  if (!app.teamId) {
    await claimDCRApplication(db, app.id, teamId, user.id);
  }

  if (decision === "deny") {
    return c.redirect(
      buildErrorRedirect(
        redirectUri,
        "access_denied",
        "User denied access",
        state
      )
    );
  }

  const { code } = await createAuthorizationCode(db, {
    applicationId: app.id,
    userId: user.id,
    teamId,
    scopes,
    redirectUri,
    codeChallenge,
  });

  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", state);

  return c.json({ redirect_url: url.toString() }, 200);
});

export default router;
