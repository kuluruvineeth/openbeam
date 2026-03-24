import type { HarvestClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createHarvestTimeEntry(
  client: HarvestClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      "/time_entries",
      properties
    );
    return {
      success: true,
      recordId: String(result.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create time entry",
    };
  }
}

export async function updateHarvestTimeEntry(
  client: HarvestClient,
  entryId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: number }>(`/time_entries/${entryId}`, properties);
    return {
      success: true,
      recordId: entryId,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update time entry",
    };
  }
}

export async function stopHarvestTimer(
  client: HarvestClient,
  entryId: string
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: number }>(`/time_entries/${entryId}/stop`, {});
    return {
      success: true,
      recordId: entryId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to stop timer",
    };
  }
}

export async function restartHarvestTimer(
  client: HarvestClient,
  entryId: string
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: number }>(`/time_entries/${entryId}/restart`, {});
    return {
      success: true,
      recordId: entryId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restart timer",
    };
  }
}

export async function createHarvestExpense(
  client: HarvestClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>("/expenses", properties);
    return {
      success: true,
      recordId: String(result.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}
