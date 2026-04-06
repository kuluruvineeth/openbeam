import { createNote, deleteNote, updateNote } from "../../evernote/actions";
import {
  createEvernoteClient,
  type EvernoteClient,
} from "../../evernote/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: EvernoteClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function optStr(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function optStrArray(
  p: Record<string, unknown>,
  key: string
): string[] | undefined {
  const v = p[key];
  return Array.isArray(v) ? (v as string[]) : undefined;
}

const actions: Record<string, Handler> = {
  async note_create(client, p) {
    const r = await createNote(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      notebookGuid: optStr(p, "notebookGuid"),
      tagNames: optStrArray(p, "tagNames"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { noteGuid: r.noteGuid, url: r.url },
    };
  },

  async note_update(client, p) {
    const r = await updateNote(client, {
      noteGuid: str(p, "noteGuid"),
      title: optStr(p, "title"),
      content: optStr(p, "content"),
      tagNames: optStrArray(p, "tagNames"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { noteGuid: r.noteGuid } };
  },

  async note_delete(client, p) {
    const r = await deleteNote(client, str(p, "noteGuid"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { noteGuid: r.noteGuid } };
  },
};

registerHandler({
  connectorType: "evernote",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Evernote action: ${actionId}`,
      };
    }

    const client = createEvernoteClient({
      connectorId,
      developerToken: credentials.accessToken,
      environment:
        (credentials.config.environment as "production" | "sandbox") ??
        "production",
    });

    return await handler(client, params);
  },
});
