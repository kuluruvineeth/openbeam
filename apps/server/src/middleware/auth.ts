import {
  createCookieConfig,
  getSessionFromHeaders,
  validateSession,
} from "@openplane/auth";
import prisma, { getUserById } from "@openplane/db";
import { createMiddleware } from "hono/factory";
import type { AuthContext } from "../types/auth";
import {
  getTeamId as getTeamIdFromContext,
  hasRequiredScopes,
} from "../types/auth";

interface SessionUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
  teamId: string | null;
}

interface SessionData {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
}

export type AuthEnv = {
  Variables: {
    user: SessionUser | null;
    session: SessionData | null;
    authContext: AuthContext;
  };
};

const cookieConfig = createCookieConfig();

export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const existingContext = c.get("authContext");
  if (existingContext && existingContext.type !== "none") {
    await next();
    return;
  }

  const token = getSessionFromHeaders(c.req.raw.headers);

  if (token) {
    const sessionData = await validateSession(prisma, token);

    if (sessionData) {
      c.set("user", sessionData.user);
      c.set("session", sessionData.session);

      const user = await getUserById(prisma, sessionData.user.id);

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

      await next();
      return;
    }
  }

  c.set("user", null);
  c.set("session", null);
  c.set("authContext", { type: "none" });

  await next();
});

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const authContext = c.get("authContext");

  if (!authContext || authContext.type === "none") {
    const accept = c.req.header("Accept");
    const isHtmlRequest = accept?.includes("text/html");

    if (isHtmlRequest) {
      const webUrl = cookieConfig.webUrl;
      return c.redirect(`${webUrl}/login?error=unauthorized`);
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

export function getTeamId(c: {
  get: <K extends keyof AuthEnv["Variables"]>(
    key: K
  ) => AuthEnv["Variables"][K];
}): string | null {
  const authContext = c.get("authContext");
  return getTeamIdFromContext(authContext);
}

export function getOrganizationId(c: {
  get: <K extends keyof AuthEnv["Variables"]>(
    key: K
  ) => AuthEnv["Variables"][K];
}): string | null {
  return getTeamId(c);
}
