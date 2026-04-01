import { createLibraryEntry, updateLibraryEntry } from "../../loopio/actions";
import { createLoopioClient, type LoopioClient } from "../../loopio/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: LoopioClient,
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
  async library_entry_create(client, p) {
    const r = await createLibraryEntry(client, {
      question: str(p, "question"),
      answer: str(p, "answer"),
      category: typeof p.category === "string" ? p.category : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async library_entry_update(client, p) {
    const r = await updateLibraryEntry(client, {
      entryId: str(p, "entryId"),
      question: typeof p.question === "string" ? p.question : undefined,
      answer: typeof p.answer === "string" ? p.answer : undefined,
      category: typeof p.category === "string" ? p.category : undefined,
      tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },
};

registerHandler({
  connectorType: "loopio",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Loopio action: ${actionId}`,
      };
    }

    const client = createLoopioClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
