import type { RouteHandler } from "@hono/zod-openapi";
import prisma, { findConnectorById } from "@openbeam/db";
import {
  handleJiraWebhookEvent,
  JiraAuth,
  parseJiraWebhookPayload,
  verifyJiraWebhookToken,
} from "@openbeam/services";
import { deleteDocumentById } from "@openbeam/vespa";
import type { AuthEnv } from "@/middleware/auth";
import { getTeamId } from "@/middleware/auth";
import logger from "@/utils/logger";
import type {
  oauthCallbackRoute,
  startOAuthRoute,
  webhookRoute,
} from "./jira.routes";

const jiraAuth = new JiraAuth();

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
    const oauthUrl = await jiraAuth.start({
      user: { id: user.id },
      workspaceId: finalWorkspaceId,
      redirectUrl,
      connectorId,
    });

    return c.json({ success: true, oauthUrl });
  } catch (error) {
    logger.error({ error }, "Jira OAuth start error");
    const message =
      error instanceof Error
        ? error.message
        : "Failed to start Jira authentication";

    return c.json({ success: false, message }, 500);
  }
};

export const oauthCallbackHandler: RouteHandler<
  typeof oauthCallbackRoute,
  AuthEnv
> = async (c) => {
  try {
    const { code, state } = c.req.valid("json");

    const { connector, redirectUrl } = await jiraAuth.complete({
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
    logger.error({ error }, "Jira OAuth callback error");
    const message = error instanceof Error ? error.message : "Unknown error";

    return c.json({ success: false, message }, 400);
  }
};
export const webhookHandler: RouteHandler<
  typeof webhookRoute,
  AuthEnv
> = async (c) => {
  const { connectorId, token } = c.req.valid("param");

  try {
    const connector = await findConnectorById(prisma, connectorId);
    if (!connector) {
      return c.json({ success: false, message: "Connector not found" }, 401);
    }

    const config = connector.config as Record<string, unknown> | null;
    const webhookSecret = config?.webhookSecret as string | undefined;

    if (!(webhookSecret && verifyJiraWebhookToken(token, webhookSecret))) {
      return c.json({ success: false, message: "Invalid token" }, 401);
    }

    const rawBody = await c.req.text();
    const payload = parseJiraWebhookPayload(rawBody);
    const result = handleJiraWebhookEvent(payload, connectorId);

    if (result.processed) {
      for (const change of result.changes) {
        if (change.action === "delete") {
          try {
            await deleteDocumentById(change.documentId);
          } catch (error) {
            logger.warn(
              { error, documentId: change.documentId },
              "Failed to delete document from Vespa"
            );
          }
        }
      }
    }

    return c.json({ success: true });
  } catch (error) {
    logger.error({ error, connectorId }, "Jira webhook handler error");
    return c.json({ success: true });
  }
};
