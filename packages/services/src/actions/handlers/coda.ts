import {
  createCodaDoc,
  createCodaRow,
  deleteCodaRow,
  listCodaDocs,
  listCodaTables,
  updateCodaRow,
} from "../../coda/actions";
import { type CodaClient, createCodaClient } from "../../coda/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: CodaClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async doc_list(client) {
    const r = await listCodaDocs(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { docs: r.docs } };
  },

  async table_list(client, p) {
    const r = await listCodaTables(client, str(p, "doc_id"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { tables: r.tables } };
  },

  async doc_create(client, p) {
    const r = await createCodaDoc(client, {
      title: str(p, "title"),
      folderId: typeof p.folderId === "string" ? p.folderId : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId, url: r.url } };
  },

  async row_create(client, p) {
    const cells = Array.isArray(p.cells)
      ? (p.cells as Array<{ column: string; value: unknown }>)
      : [];
    const r = await createCodaRow(
      client,
      { docId: str(p, "docId"), tableId: str(p, "tableId") },
      cells
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async row_update(client, p) {
    const cells = Array.isArray(p.cells)
      ? (p.cells as Array<{ column: string; value: unknown }>)
      : [];
    const r = await updateCodaRow(
      client,
      {
        docId: str(p, "docId"),
        tableId: str(p, "tableId"),
        rowId: str(p, "rowId"),
      },
      cells
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { recordId: r.recordId } };
  },

  async row_delete(client, p) {
    const r = await deleteCodaRow(client, {
      docId: str(p, "docId"),
      tableId: str(p, "tableId"),
      rowId: str(p, "rowId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },
};

registerHandler({
  connectorType: "coda",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Coda action: ${actionId}`,
      };
    }

    const client = createCodaClient({
      connectorId: "",
      apiKey: (credentials.config.apiKey as string) ?? "",
    });

    return await handler(client, params);
  },
});
