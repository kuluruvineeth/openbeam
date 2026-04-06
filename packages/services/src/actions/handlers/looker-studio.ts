import { getReportMetadata } from "../../looker-studio/actions";
import {
  createLookerStudioClient,
  type LookerStudioClient,
} from "../../looker-studio/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: LookerStudioClient,
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
  async report_metadata(client, p) {
    const r = await getReportMetadata(client, str(p, "reportId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { reportId: r.reportId, url: r.url } };
  },
};

registerHandler({
  connectorType: "looker-studio",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Looker Studio action: ${actionId}`,
      };
    }

    const client = createLookerStudioClient({
      connectorId,
      accessToken: credentials.accessToken || undefined,
      userEmail:
        typeof credentials.config.userEmail === "string"
          ? credentials.config.userEmail
          : undefined,
    });

    return await handler(client, params);
  },
});
