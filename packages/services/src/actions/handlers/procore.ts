import {
  createProcoreRfi,
  createProcoreSubmittal,
  updateProcoreRfi,
} from "../../procore/actions";
import { createProcoreClient, type ProcoreClient } from "../../procore/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: ProcoreClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  if (typeof v === "number") {
    return v;
  }
  const parsed = Number(str(p, key));
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

function props(p: Record<string, unknown>): Record<string, unknown> {
  return (
    typeof p.properties === "object" && p.properties !== null ? p.properties : p
  ) as Record<string, unknown>;
}

const actions: Record<string, Handler> = {
  async rfi_create(client, p) {
    const r = await createProcoreRfi(client, num(p, "projectId"), props(p));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async rfi_update(client, p) {
    const r = await updateProcoreRfi(
      client,
      num(p, "projectId"),
      str(p, "rfiId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async submittal_create(client, p) {
    const r = await createProcoreSubmittal(
      client,
      num(p, "projectId"),
      props(p)
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },
};

registerHandler({
  connectorType: "procore",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Procore action: ${actionId}`,
      };
    }

    const client = createProcoreClient({
      connectorId,
      accessToken: credentials.accessToken,
      companyId: (credentials.config.companyId as string) ?? "",
    });

    return await handler(client, params);
  },
});
