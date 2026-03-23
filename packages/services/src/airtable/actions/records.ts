import type { AirtableClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

type RecordLocation = {
  baseId: string;
  tableIdOrName: string;
};

export async function createAirtableRecord(
  client: AirtableClient,
  location: RecordLocation,
  fields: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      id: string;
      createdTime: string;
      fields: Record<string, unknown>;
    }>(`/${location.baseId}/${encodeURIComponent(location.tableIdOrName)}`, {
      fields,
    });
    return {
      success: true,
      recordId: result.id,
      url: `https://airtable.com/${location.baseId}/${location.tableIdOrName}/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create record",
    };
  }
}

export async function updateAirtableRecord(
  client: AirtableClient,
  location: RecordLocation & { recordId: string },
  fields: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{
      id: string;
      fields: Record<string, unknown>;
    }>(
      `/${location.baseId}/${encodeURIComponent(location.tableIdOrName)}/${location.recordId}`,
      { fields }
    );
    return {
      success: true,
      recordId: location.recordId,
      url: `https://airtable.com/${location.baseId}/${location.tableIdOrName}/${location.recordId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update record",
    };
  }
}

export async function deleteAirtableRecord(
  client: AirtableClient,
  location: RecordLocation & { recordId: string }
): Promise<RecordActionResult> {
  try {
    await client.del<{ id: string; deleted: boolean }>(
      `/${location.baseId}/${encodeURIComponent(location.tableIdOrName)}/${location.recordId}`
    );
    return {
      success: true,
      recordId: location.recordId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete record",
    };
  }
}
