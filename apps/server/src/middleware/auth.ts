import { auth } from "@openplane/auth";
import { createMiddleware } from "hono/factory";

type SessionResponse = Awaited<ReturnType<typeof auth.api.getSession>>;
type User = NonNullable<SessionResponse>["user"];
type BaseSession = NonNullable<SessionResponse>["session"];

// Extend the session type to include organization plugin fields
type ExtendedSession = BaseSession & {
  activeOrganizationId?: string | null;
};

export type AuthEnv = {
  Variables: {
    user: User | null;
    session: ExtendedSession | null;
  };
};

export const sessionMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });

  if (sessionData) {
    c.set("user", sessionData.user);
    c.set("session", sessionData.session as ExtendedSession);
  } else {
    c.set("user", null);
    c.set("session", null);
  }

  await next();
});

export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const user = c.get("user");
  const session = c.get("session");

  if (!(user && session)) {
    const accept = c.req.header("Accept");
    const isHtmlRequest = accept?.includes("text/html");

    if (isHtmlRequest) {
      const loginUrl = `${process.env.CORS_ORIGIN || ""}/login`;
      return c.redirect(`${loginUrl}?error=unauthorized`);
    }

    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
