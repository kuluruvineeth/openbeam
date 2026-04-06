import {
  createBoxFolder,
  deleteBoxItem,
  listBoxFolderItems,
  moveBoxItem,
  shareBoxItem,
} from "../../box/actions";
import { type BoxClient, createBoxClient } from "../../box/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: BoxClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async folder_create(client, p) {
    const r = await createBoxFolder(
      client,
      str(p, "name"),
      str(p, "parent_id")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async item_move(client, p) {
    const itemType = str(p, "item_type") as "file" | "folder";
    const r = await moveBoxItem(
      client,
      itemType,
      str(p, "item_id"),
      str(p, "new_parent_id")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async item_delete(client, p) {
    const itemType = str(p, "item_type") as "file" | "folder";
    const r = await deleteBoxItem(client, itemType, str(p, "item_id"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async item_share(client, p) {
    const itemType = str(p, "item_type") as "file" | "folder";
    const access = typeof p.access === "string" ? p.access : "open";
    const r = await shareBoxItem(client, itemType, str(p, "item_id"), access);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async folder_list(client, p) {
    const folderId =
      typeof p.folder_id === "string" && p.folder_id.trim()
        ? p.folder_id.trim()
        : "0";
    const r = await listBoxFolderItems(client, folderId);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.data } };
  },
};

registerHandler({
  connectorType: "box",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Box action: ${actionId}`,
      };
    }

    const client = createBoxClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
