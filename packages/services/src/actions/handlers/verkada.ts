import { lockDoor, unlockDoor } from "../../verkada/actions";
import { createVerkadaClient, type VerkadaClient } from "../../verkada/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: VerkadaClient,
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
  async door_lock(client, p) {
    const r = await lockDoor(client, str(p, "doorId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { locked: true } };
  },

  async door_unlock(client, p) {
    const r = await unlockDoor(client, str(p, "doorId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { unlocked: true } };
  },
};

registerHandler({
  connectorType: "verkada",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Verkada action: ${actionId}`,
      };
    }

    const client = createVerkadaClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      region:
        typeof credentials.config.region === "string"
          ? (credentials.config.region as "us" | "eu" | "au")
          : "us",
    });

    return await handler(client, params);
  },
});
