import type { RouteHandler } from "@hono/zod-openapi";
import { SlackAuth } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type { oauthCallbackRoute, startOAuthRoute } from "./slack.routes";

const slackAuth = new SlackAuth();

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
    const oauthUrl = await slackAuth.start({
      user: { id: user.id },
      workspaceId: finalWorkspaceId,
      redirectUrl,
      connectorId,
    });

    return c.json({ success: true, oauthUrl });
  } catch (error) {
    logger.error({ error }, "Slack OAuth start error");
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Slack authentication";

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

    const { connector, redirectUrl } = await slackAuth.complete({
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
    logger.error({ error }, "Slack OAuth callback error");
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};
