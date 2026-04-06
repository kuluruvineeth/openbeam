import { createEntry, updateEntry } from "../../benchling/actions";
import {
  type BenchlingClient,
  createBenchlingClient,
} from "../../benchling/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: BenchlingClient,
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
  async entry_create(client, p) {
    const r = await createEntry(client, {
      folderId: str(p, "folderId"),
      name: str(p, "name"),
      entryTemplateId:
        typeof p.entryTemplateId === "string" ? p.entryTemplateId : undefined,
      schemaId: typeof p.schemaId === "string" ? p.schemaId : undefined,
      fields:
        typeof p.fields === "object" && p.fields !== null
          ? (p.fields as Record<string, { value: unknown }>)
          : undefined,
      authorIds: Array.isArray(p.authorIds)
        ? (p.authorIds as string[])
        : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async entry_update(client, p) {
    const r = await updateEntry(client, {
      entryId: str(p, "entryId"),
      name: typeof p.name === "string" ? p.name : undefined,
      schemaId: typeof p.schemaId === "string" ? p.schemaId : undefined,
      fields:
        typeof p.fields === "object" && p.fields !== null
          ? (p.fields as Record<string, { value: unknown }>)
          : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "benchling",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Benchling action: ${actionId}`,
      };
    }

    const client = createBenchlingClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
      tenant: (credentials.config.tenantUrl as string) ?? "",
    });

    return await handler(client, params);
  },
});
