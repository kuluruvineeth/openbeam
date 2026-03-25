import type { LookerStudioClient } from "../client";

export interface ReportActionResult {
  success: boolean;
  reportId?: string;
  url?: string;
  error?: string;
}

export async function getReportMetadata(
  client: LookerStudioClient,
  reportId: string
): Promise<ReportActionResult> {
  try {
    const result = await client.get<{
      id: string;
      name: string;
      webViewLink?: string;
    }>(`/files/${reportId}`, {
      fields: "id,name,webViewLink,modifiedTime,owners",
      supportsAllDrives: true,
    });
    return {
      success: true,
      reportId: result.id,
      url: result.webViewLink,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get report metadata",
    };
  }
}
