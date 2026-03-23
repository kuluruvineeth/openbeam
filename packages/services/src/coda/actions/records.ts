import type { CodaClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createCodaDoc(
  client: CodaClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const body: Record<string, unknown> = { title: properties.title };
    if (properties.folderId) {
      body.folderId = properties.folderId;
    }
    const result = await client.post<{
      id: string;
      browserLink: string;
    }>("/docs", body);
    return {
      success: true,
      recordId: result.id,
      url: result.browserLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create doc",
    };
  }
}

interface RowParams {
  docId: string;
  tableId: string;
}

export async function createCodaRow(
  client: CodaClient,
  params: RowParams,
  cells: Array<{ column: string; value: unknown }>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      addedRowIds: string[];
      requestId: string;
    }>(`/docs/${params.docId}/tables/${params.tableId}/rows`, {
      rows: [{ cells }],
    });
    const rowId = result.addedRowIds?.[0];
    return {
      success: true,
      recordId: rowId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create row",
    };
  }
}

export async function updateCodaRow(
  client: CodaClient,
  params: RowParams & { rowId: string },
  cells: Array<{ column: string; value: unknown }>
): Promise<RecordActionResult> {
  try {
    await client.put(
      `/docs/${params.docId}/tables/${params.tableId}/rows/${params.rowId}`,
      { row: { cells } }
    );
    return {
      success: true,
      recordId: params.rowId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update row",
    };
  }
}

export async function deleteCodaRow(
  client: CodaClient,
  params: RowParams & { rowId: string }
): Promise<RecordActionResult> {
  try {
    await client.del(
      `/docs/${params.docId}/tables/${params.tableId}/rows/${params.rowId}`
    );
    return {
      success: true,
      recordId: params.rowId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete row",
    };
  }
}
