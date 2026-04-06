import { addComment } from "../../figma/actions";
import { createFigmaClient, type FigmaClient } from "../../figma/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: FigmaClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async comment_add(client, p) {
    const r = await addComment(
      client,
      str(p, "file_key"),
      str(p, "message"),
      typeof p.parent_id === "string" ? p.parent_id : undefined
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },
};

registerHandler({
  connectorType: "figma",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Figma action: ${actionId}`,
      };
    }

    const client = createFigmaClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
