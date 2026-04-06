import { executeCommand } from "../../smartthings/actions";
import {
  createSmartThingsClient,
  type SmartThingsClient,
} from "../../smartthings/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SmartThingsClient,
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
  async device_command(client, p) {
    const r = await executeCommand(client, {
      deviceId: str(p, "device_id"),
      capability: str(p, "capability"),
      command: str(p, "command"),
      args: Array.isArray(p.args) ? (p.args as unknown[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { deviceId: r.deviceId, status: r.status },
    };
  },
};

registerHandler({
  connectorType: "smartthings",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported SmartThings action: ${actionId}`,
      };
    }

    const client = createSmartThingsClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
