import type { SmartsheetClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateSheetParams {
  name: string;
  columns: { title: string; type: string; primary?: boolean }[];
}

interface AddRowParams {
  sheetId: number;
  cells: { columnId: number; value: string | number | boolean }[];
  toTop?: boolean;
}

interface UpdateRowParams {
  sheetId: number;
  rowId: number;
  cells: { columnId: number; value: string | number | boolean }[];
}

export async function createSheet(
  client: SmartsheetClient,
  params: CreateSheetParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      message: string;
      resultCode: number;
      result: { id: number; name: string; permalink: string };
    }>("/sheets", {
      name: params.name,
      columns: params.columns,
    });

    return {
      success: true,
      id: String(response.result.id),
      url: response.result.permalink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create sheet",
    };
  }
}

export async function addRow(
  client: SmartsheetClient,
  params: AddRowParams
): Promise<ActionResult> {
  try {
    const response = await client.post<{
      message: string;
      resultCode: number;
      result: { id: number }[];
    }>(`/sheets/${params.sheetId}/rows`, [
      {
        toTop: params.toTop ?? false,
        cells: params.cells,
      },
    ]);

    const rowId = response.result?.[0]?.id;
    return {
      success: true,
      id: rowId ? String(rowId) : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add row",
    };
  }
}

export async function updateRow(
  client: SmartsheetClient,
  params: UpdateRowParams
): Promise<ActionResult> {
  try {
    await client.put(`/sheets/${params.sheetId}/rows`, [
      {
        id: params.rowId,
        cells: params.cells,
      },
    ]);

    return { success: true, id: String(params.rowId) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update row",
    };
  }
}
