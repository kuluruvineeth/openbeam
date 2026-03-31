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

const actions: Record<string, Handler> = {
  async note_create(client, p) {
    const r = await createNote(client, {
      title: str(p, "title"),
      content: str(p, "content"),
      notebookGuid:
        typeof p.notebookGuid === "string" ? p.notebookGuid : undefined,
      tagNames: Array.isArray(p.tagNames)
        ? (p.tagNames as string[])
        : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { noteGuid: r.noteGuid, url: r.url } };
  },

  async note_update(client, p) {
    const r = await updateNote(client, {
      noteGuid: str(p, "noteGuid"),
      title: typeof p.title === "string" ? p.title : undefined,
      content: typeof p.content === "string" ? p.content : undefined,
      tagNames: Array.isArray(p.tagNames)
        ? (p.tagNames as string[])
        : undefined,
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
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "evernote",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Evernote action: ${actionId}`,
      };
    }

    const client = createEvernoteClient({
      connectorId: "",
      developerToken: (credentials.config.developerToken as string) ?? "",
      environment:
        typeof credentials.config.environment === "string"
          ? (credentials.config.environment as "production" | "sandbox")
          : undefined,
    });

    return await handler(client, params);
  },
});
