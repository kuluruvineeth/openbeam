import { addRow, createSheet, updateRow } from "../../smartsheet/actions";
import {
  createSmartsheetClient,
  type SmartsheetClient,
} from "../../smartsheet/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: SmartsheetClient,
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
  async sheet_create(client, p) {
    const r = await createSheet(client, {
      name: str(p, "name"),
      columns: Array.isArray(p.columns)
        ? (p.columns as Array<{ title: string; type: string }>)
        : [],
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async row_add(client, p) {
    const r = await addRow(client, {
      sheetId: str(p, "sheetId"),
      cells: Array.isArray(p.cells)
        ? (p.cells as Array<{ columnId: string; value: unknown }>)
        : [],
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async row_update(client, p) {
    const r = await updateRow(client, {
      sheetId: str(p, "sheetId"),
      rowId: str(p, "rowId"),
      cells: Array.isArray(p.cells)
        ? (p.cells as Array<{ columnId: string; value: unknown }>)
        : [],
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "smartsheet",
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Smartsheet action: ${actionId}`,
      };
    }

    const client = createSmartsheetClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
