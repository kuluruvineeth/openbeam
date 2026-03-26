import type { ProcoreClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createProcoreRfi(
  client: ProcoreClient,
  projectId: number,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      `/projects/${projectId}/rfis`,
      { rfi: properties }
    );
    return {
      success: true,
      recordId: String(result.id),
      url: `https://app.procore.com/projects/${projectId}/rfis/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create RFI",
    };
  }
}

export async function updateProcoreRfi(
  client: ProcoreClient,
  projectId: number,
  rfiId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: number }>(`/projects/${projectId}/rfis/${rfiId}`, {
      rfi: properties,
    });
    return {
      success: true,
      recordId: rfiId,
      url: `https://app.procore.com/projects/${projectId}/rfis/${rfiId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update RFI",
    };
  }
}

export async function createProcoreSubmittal(
  client: ProcoreClient,
  projectId: number,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: number }>(
      `/projects/${projectId}/submittals`,
      { submittal: properties }
    );
    return {
      success: true,
      recordId: String(result.id),
      url: `https://app.procore.com/projects/${projectId}/submittals/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create submittal",
    };
  }
}
