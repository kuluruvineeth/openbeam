import { SlackAuth } from "@openplane/api";
import { Hono } from "hono";
import { type AuthEnv, requireAuth } from "../../middleware/auth";

const slackRouter = new Hono<AuthEnv>();
const slackAuth = new SlackAuth();

slackRouter.use("*", requireAuth);

interface OAuthStartResponse {
  success: boolean;
  oauthUrl?: string;
  message?: string;
}

interface OAuthCallbackResponse {
  success: boolean;
  connectorId?: string;
  name?: string;
  redirectUrl?: string;
  message?: string;
}

slackRouter.get("/oauth/start", async (c) => {
  const user = c.get("user");
  const session = c.get("session");

  if (user === null || session === null) {
    return c.json<OAuthStartResponse>(
      { success: false, message: "Unauthorized" },
      401
    );
  }

  const activeOrgId = session.activeOrganizationId;
  const workspaceId = c.req.query("workspaceId") || activeOrgId;
  const connectorId = c.req.query("connectorId");

  if (!workspaceId) {
    return c.json<OAuthStartResponse>(
      { success: false, message: "Workspace ID required" },
      400
    );
  }

  if (!connectorId) {
    return c.json<OAuthStartResponse>(
      { success: false, message: "Connector ID required" },
      400
    );
  }

  try {
    const oauthUrl = await slackAuth.start({
      user: { id: user.id },
      workspaceId,
      redirectUrl: c.req.query("redirectUrl"),
      connectorId,
    });

    return c.json<OAuthStartResponse>({ success: true, oauthUrl });
  } catch (error) {
    console.error("Slack OAuth start error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Slack authentication";

    return c.json<OAuthStartResponse>({ success: false, message }, 500);
  }
});

slackRouter.post("/callback", async (c) => {
  try {
    const body = await c.req.json<{ code?: string; state?: string }>();
    const { code, state } = body;

    if (code === undefined || state === undefined) {
      return c.json<OAuthCallbackResponse>(
        { success: false, message: "Missing code or state" },
        400
      );
    }

    const { connector, redirectUrl } = await slackAuth.complete({
      code,
      state,
    });

    return c.json<OAuthCallbackResponse>({
      success: true,
      connectorId: connector.id,
      name: connector.name,
      redirectUrl,
    });
  } catch (error) {
    console.error("Slack OAuth callback error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json<OAuthCallbackResponse>({ success: false, message }, 400);
  }
});

export default slackRouter;
