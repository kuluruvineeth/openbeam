import { auth } from "@openplane/auth";
import { createMiddleware } from "hono/factory";
import type { AuthContext } from "../types/auth";
import {
  getTeamId as getTeamIdFromContext,
  hasRequiredScopes,
} from "../types/auth";

type SessionResponse = Awaited<ReturnType<typeof auth.api.getSession>>;
type User = NonNullable<SessionResponse>["user"];
type BaseSession = NonNullable<SessionResponse>["session"];

type ExtendedSession = BaseSession;

export type AuthEnv = {
  Variables: {
    user: User | null;
    session: ExtendedSession | null;
    authContext: AuthContext;
  };
};

export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  // Check if already authenticated via API key
  const existingContext = c.get("authContext");
  if (existingContext && existingContext.type !== "none") {
    await next();
    return;
  }

  // Try session authentication
  const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });

  if (sessionData) {
    c.set("user", sessionData.user);
    c.set("session", sessionData.session as ExtendedSession);

    const { default: prisma, getUserById } = await import("@openplane/db");
    const user = await getUserById(prisma, sessionData.user.id);

    // Set session auth context
    if (user?.teamId) {
      c.set("authContext", {
        type: "session",
        userId: sessionData.user.id,
        teamId: user.teamId,
        email: sessionData.user.email,
      });
    } else {
      c.set("authContext", {
        type: "session",
        userId: sessionData.user.id,
        teamId: null,
        email: sessionData.user.email,
      });
    }
  } else {
    c.set("user", null);
    c.set("session", null);
    c.set("authContext", { type: "none" });
  }

  await next();
});

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authContext = c.get("authContext");

  if (!authContext || authContext.type === "none") {
    const accept = c.req.header("Accept");
    const isHtmlRequest = accept?.includes("text/html");

    if (isHtmlRequest) {
      const loginUrl = `${process.env.CORS_ORIGIN || ""}/login`;
      return c.redirect(`${loginUrl}?error=unauthorized`);
    }

    return c.json(
      {
        error: "Unauthorized",
        message:
          "Valid API key or session required. Use 'Authorization: Bearer op_xxx' header or session cookie.",
      },
      401
    );
  }

  await next();
});

/**
 * Require specific scopes for API keys
 * Session users always pass (implicit full access)
 */
export function requireScopes(scopes: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const authContext = c.get("authContext");

    if (!authContext || authContext.type === "none") {
      return c.json(
        {
          error: "Unauthorized",
          message: "Authentication required",
        },
        401
      );
    }

    if (!hasRequiredScopes(authContext, scopes)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Required scopes: ${scopes.join(", ")}`,
          requiredScopes: scopes,
        },
        403
      );
    }

    await next();
  });
}

/**
 * Get team ID from auth context
 */
export function getTeamId(c: {
  get: <K extends keyof AuthEnv["Variables"]>(
    key: K
  ) => AuthEnv["Variables"][K];
}): string | null {
  const authContext = c.get("authContext");
  return getTeamIdFromContext(authContext);
}

/**
 * @deprecated Use getTeamId instead
 */
export function getOrganizationId(c: {
  get: <K extends keyof AuthEnv["Variables"]>(
    key: K
  ) => AuthEnv["Variables"][K];
}): string | null {
  return getTeamId(c);
}
