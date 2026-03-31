import { resolveAlert } from "../../samsara/actions/alerts";
import { sendDriverMessage } from "../../samsara/actions/drivers";
import { createSamsaraClient, type SamsaraClient } from "../../samsara/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SamsaraClient,
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
  async alert_resolve(client, p) {
    const r = await resolveAlert(client, {
      alertId: str(p, "alertId"),
      resolvedBy: typeof p.resolvedBy === "string" ? p.resolvedBy : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { resolved: true } };
  },

  async driver_message_send(client, p) {
    const r = await sendDriverMessage(client, {
      driverId: str(p, "driverId"),
      message: str(p, "message"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { sent: true } };
  },
};

registerHandler({
  connectorType: "samsara",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Samsara action: ${actionId}`,
      };
    }

    const client = createSamsaraClient({
      connectorId: "",
      apiToken: (credentials.config.apiToken as string) ?? "",
      region:
        typeof credentials.config.region === "string"
          ? (credentials.config.region as "us" | "eu")
          : undefined,
    });

    return await handler(client, params);
  },
});
