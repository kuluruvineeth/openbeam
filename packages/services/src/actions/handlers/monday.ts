import {
  addUpdate,
  createItem,
  listBoards,
  listGroups,
  moveItemToGroup,
} from "../../monday/actions";
import { createMondayClient, type MondayClient } from "../../monday/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: MondayClient,
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
  async board_list(client, p) {
    const limit = typeof p.limit === "number" ? p.limit : undefined;
    const r = await listBoards(client, { limit });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async group_list(client, p) {
    const r = await listGroups(client, { boardId: str(p, "boardId") });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { items: r.items } };
  },

  async item_create(client, p) {
    const r = await createItem(client, {
      boardId: str(p, "boardId"),
      name: str(p, "name"),
      groupId: typeof p.groupId === "string" ? p.groupId : undefined,
      columnValues:
        typeof p.columnValues === "object" && p.columnValues !== null
          ? (p.columnValues as Record<string, unknown>)
          : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async item_add_update(client, p) {
    const r = await addUpdate(client, {
      itemId: str(p, "itemId"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async item_move(client, p) {
    const r = await moveItemToGroup(client, {
      itemId: str(p, "itemId"),
      groupId: str(p, "groupId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "monday",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Monday action: ${actionId}`,
      };
    }

    const client = createMondayClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
