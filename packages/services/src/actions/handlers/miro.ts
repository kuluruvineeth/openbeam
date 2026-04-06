import {
  createMiroBoard,
  createMiroStickyNote,
  deleteMiroItem,
  listMiroBoards,
  updateMiroStickyNote,
} from "../../miro/actions";
import { createMiroClient, type MiroClient } from "../../miro/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: MiroClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async board_list(client) {
    const r = await listMiroBoards(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { boards: r.boards } };
  },

  async board_create(client, p) {
    const r = await createMiroBoard(client, {
      name: str(p, "name"),
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async sticky_note_create(client, p) {
    const r = await createMiroStickyNote(client, str(p, "board_id"), {
      content: str(p, "content"),
      shape: typeof p.shape === "string" ? p.shape : undefined,
      x: typeof p.x === "number" ? p.x : undefined,
      y: typeof p.y === "number" ? p.y : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async sticky_note_update(client, p) {
    const r = await updateMiroStickyNote(
      client,
      str(p, "board_id"),
      str(p, "item_id"),
      {
        content: typeof p.content === "string" ? p.content : undefined,
        shape: typeof p.shape === "string" ? p.shape : undefined,
      }
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async item_delete(client, p) {
    const r = await deleteMiroItem(
      client,
      str(p, "board_id"),
      str(p, "item_id")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },
};

registerHandler({
  connectorType: "miro",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Miro action: ${actionId}`,
      };
    }

    const client = createMiroClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
