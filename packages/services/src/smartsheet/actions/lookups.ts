import type { SmartsheetClient } from "../client";

interface SheetListResult {
  success: boolean;
  sheets?: Array<{ id: string; name: string; accessLevel: string }>;
  error?: string;
}

export async function listSmartsheetSheets(
  client: SmartsheetClient
): Promise<SheetListResult> {
  try {
    const data = await client.get<{
      data: Array<{
        id: number;
        name: string;
        accessLevel: string;
      }>;
    }>("/sheets", { pageSize: "100", includeAll: "true" });

    return {
      success: true,
      sheets: data.data.map((s) => ({
        id: String(s.id),
        name: s.name,
        accessLevel: s.accessLevel,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list sheets",
    };
  }
}
