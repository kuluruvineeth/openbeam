import type { RouteHandler } from "@hono/zod-openapi";
import { AzureDevOpsAuth } from "@openbeam/services";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type {
  oauthCallbackRoute,
  startOAuthRoute,
} from "./azure-devops.routes";

const azureDevOpsAuth = new AzureDevOpsAuth();

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

  try {
    const oauthUrl = await azureDevOpsAuth.start({
      user: { id: user.id },
      workspaceId: finalWorkspaceId,
      redirectUrl,
      connectorId,
    });

    return c.json({ success: true, oauthUrl });
  } catch (error) {
    logger.error({ error }, "Azure DevOps OAuth start error");
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Azure DevOps authentication";

    return c.json({ success: false, message }, 500);
  }
};

export const oauthCallbackHandler: RouteHandler<
  typeof oauthCallbackRoute,
  AuthEnv
> = async (c) => {
  try {
    const { code, state } = c.req.valid("json");

    const { connector, redirectUrl } = await azureDevOpsAuth.complete({
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
    logger.error({ error }, "Azure DevOps OAuth callback error");
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};
