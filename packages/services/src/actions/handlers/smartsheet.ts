import {
  addRow,
  createSheet,
  listSmartsheetSheets,
  updateRow,
} from "../../smartsheet/actions";
import {
  createSmartsheetClient,
  type SmartsheetClient,
} from "../../smartsheet/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: SmartsheetClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async sheet_list(client) {
    const r = await listSmartsheetSheets(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { sheets: r.sheets } };
  },

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
    const sheetId =
      typeof p.sheetId === "number" ? p.sheetId : Number(str(p, "sheetId"));
    const cells = Array.isArray(p.cells)
      ? (p.cells as Array<{
          columnId: number;
          value: string | number | boolean;
        }>)
      : [];
    const r = await addRow(client, { sheetId, cells });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async row_update(client, p) {
    const sheetId =
      typeof p.sheetId === "number" ? p.sheetId : Number(str(p, "sheetId"));
    const rowId =
      typeof p.rowId === "number" ? p.rowId : Number(str(p, "rowId"));
    const cells = Array.isArray(p.cells)
      ? (p.cells as Array<{
          columnId: number;
          value: string | number | boolean;
        }>)
      : [];
    const r = await updateRow(client, { sheetId, rowId, cells });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "smartsheet",
  supportedActions: Object.keys(actions),
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
