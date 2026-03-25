import type { LucidClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createLucidDocument(
  client: LucidClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string; editUrl: string }>(
      "/documents",
      properties
    );
    return {
      success: true,
      recordId: result.id,
      url: result.editUrl,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create document",
    };
  }
}

export async function updateLucidDocument(
  client: LucidClient,
  documentId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch<{ id: string }>(`/documents/${documentId}`, properties);
    return {
      success: true,
      recordId: documentId,
      url: `https://lucid.app/documents/${documentId}/edit`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update document",
    };
  }
}

export async function createLucidFolder(
  client: LucidClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string }>("/folders", properties);
    return {
      success: true,
      recordId: result.id,
      url: `https://lucid.app/folder/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}
