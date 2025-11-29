import type { RouteHandler } from "@hono/zod-openapi";
import { GmailAuth, GmailServiceAccountAuth } from "@openplane/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import type {
  oauthCallbackRoute,
  serviceAccountAuthRoute,
  startOAuthRoute,
} from "./gmail.routes";

const gmailAuth = new GmailAuth();
const gmailServiceAccountAuth = new GmailServiceAccountAuth();

export const startOAuthHandler: RouteHandler<
  typeof startOAuthRoute,
  AuthEnv
> = async (c) => {
  const user = c.get("user");

  if (user === null) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const { workspaceId, connectorId, redirectUrl } = c.req.valid("query");
  const teamId = getTeamId(c);
  const finalWorkspaceId = workspaceId || teamId;

  if (!finalWorkspaceId) {
    return c.json({ success: false, message: "Workspace ID required" }, 400);
  }

  if (!connectorId) {
    return c.json({ success: false, message: "Connector ID required" }, 400);
  }

  try {
    const oauthUrl = await gmailAuth.start({
      user: { id: user.id },
      workspaceId: finalWorkspaceId,
      redirectUrl,
      connectorId,
    });

    return c.json({ success: true, oauthUrl });
  } catch (error) {
    console.error("Gmail OAuth start error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Gmail authentication";

    return c.json({ success: false, message }, 500);
  }
};

export const oauthCallbackHandler: RouteHandler<
  typeof oauthCallbackRoute,
  AuthEnv
> = async (c) => {
  try {
    const { code, state } = c.req.valid("json");

    if (code === undefined || state === undefined) {
      return c.json({ success: false, message: "Missing code or state" }, 400);
    }

    const { connector, redirectUrl } = await gmailAuth.complete({
      code,
      state,
    });

    return c.json({
      success: true,
      connectorId: connector.id,
      name: connector.name,
      redirectUrl,
    });
  } catch (error) {
    console.error("Gmail OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};

export const serviceAccountAuthHandler: RouteHandler<
  typeof serviceAccountAuthRoute,
  AuthEnv
> = async (c) => {
  const user = c.get("user");

  if (user === null) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  const teamId = getTeamId(c);

  if (!teamId) {
    return c.json({ success: false, message: "Workspace ID required" }, 400);
  }

  try {
    const { connectorId, credentials, delegatedEmail } = c.req.valid("json");

    const { connector } = await gmailServiceAccountAuth.authenticate({
      user: { id: user.id },
      workspaceId: teamId,
      connectorId,
      credentials: credentials || "",
      delegatedEmail: delegatedEmail || "",
    });

    return c.json({
      success: true,
      connectorId: connector.id,
      name: connector.name,
    });
  } catch (error) {
    console.error("Gmail service account auth error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};
