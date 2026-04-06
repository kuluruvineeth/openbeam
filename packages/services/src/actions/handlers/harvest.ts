import {
  createHarvestExpense,
  createHarvestTimeEntry,
  restartHarvestTimer,
  stopHarvestTimer,
  updateHarvestTimeEntry,
} from "../../harvest/actions";
import { createHarvestClient, type HarvestClient } from "../../harvest/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: HarvestClient,
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
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async time_entry_create(client, p) {
    const r = await createHarvestTimeEntry(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async time_entry_update(client, p) {
    const r = await updateHarvestTimeEntry(client, str(p, "entryId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async timer_stop(client, p) {
    const r = await stopHarvestTimer(client, str(p, "entryId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async timer_restart(client, p) {
    const r = await restartHarvestTimer(client, str(p, "entryId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async expense_create(client, p) {
    const r = await createHarvestExpense(client, props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },
};

registerHandler({
  connectorType: "harvest",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Harvest action: ${actionId}`,
      };
    }

    const client = createHarvestClient({
      connectorId,
      accessToken: credentials.accessToken,
      accountId: (credentials.config.accountId as string) ?? "",
    });

    return await handler(client, params);
  },
});
