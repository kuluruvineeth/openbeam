import { updateWorker } from "../../workday/actions";
import { createWorkdayClient, type WorkdayClient } from "../../workday/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: WorkdayClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.fields === "object" && p.fields !== null ? p.fields : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async worker_update(client, p) {
    const r = await updateWorker(client, str(p, "workerId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { workerId: r.workerId } };
  },
};

registerHandler({
  connectorType: "workday",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Workday action: ${actionId}`,
      };
    }

    const client = createWorkdayClient({
      connectorId,
      accessToken: credentials.accessToken,
      tenant: (credentials.config.tenant as string) ?? "",
      host: (credentials.config.host as string) ?? "",
    });

    return await handler(client, params);
  },
});
