import type { MiroClient } from "../client";

export interface MiroActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createMiroBoard(
  client: MiroClient,
  properties: { name: string; description?: string }
): Promise<MiroActionResult> {
  try {
    const result = await client.post<{ id: string; viewLink: string }>(
      "/boards",
      {
        name: properties.name,
        description: properties.description ?? "",
      }
    );
    return {
      success: true,
      recordId: result.id,
      url: result.viewLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create board",
    };
  }
}
