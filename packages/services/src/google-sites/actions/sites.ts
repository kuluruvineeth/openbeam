import type { GoogleSitesClient } from "../client";

export interface SiteActionResult {
  success: boolean;
  siteId?: string;
  url?: string;
  error?: string;
}

export async function getGoogleSiteMetadata(
  client: GoogleSitesClient,
  siteId: string
): Promise<SiteActionResult> {
  try {
    const result = await client.get<{
      id: string;
      name: string;
      webViewLink?: string;
    }>(`/files/${siteId}`, {
      fields: "id,name,webViewLink,modifiedTime,owners",
      supportsAllDrives: true,
    });
    return {
      success: true,
      siteId: result.id,
      url: result.webViewLink,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get site metadata",
    };
  }
}
