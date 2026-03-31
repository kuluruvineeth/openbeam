import {
  createAirtableRecord,
  deleteAirtableRecord,
  updateAirtableRecord,
} from "../../airtable/actions";
import {
  type AirtableClient,
  createAirtableClient,
} from "../../airtable/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AirtableClient,
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
  async record_create(client, p) {
    const r = await createAirtableRecord(
      client,
      { baseId: str(p, "base_id"), tableIdOrName: str(p, "table") },
      (p.fields as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async record_update(client, p) {
    const r = await updateAirtableRecord(
      client,
      {
        baseId: str(p, "base_id"),
        tableIdOrName: str(p, "table"),
        recordId: str(p, "record_id"),
      },
      (p.fields as Record<string, unknown>) ?? {}
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async record_delete(client, p) {
    const r = await deleteAirtableRecord(client, {
      baseId: str(p, "base_id"),
      tableIdOrName: str(p, "table"),
      recordId: str(p, "record_id"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },
};

registerHandler({
  connectorType: "airtable",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Airtable action: ${actionId}`,
      };
    }

    const client = createAirtableClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
