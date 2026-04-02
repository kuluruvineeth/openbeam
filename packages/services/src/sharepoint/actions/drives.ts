import type { MicrosoftGraphClient } from "../../microsoft/client";

export interface SharePointDrive {
  id: string;
  name: string;
  webUrl: string;
  driveType?: string;
}

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
}

export interface SharePointLookupResult<T> {
  success: boolean;
  data?: T[];
  error?: string;
}

export async function listDrives(
  client: MicrosoftGraphClient,
  siteId?: string
): Promise<SharePointLookupResult<SharePointDrive>> {
  try {
    const path = siteId ? `/sites/${siteId}/drives` : "/me/drives";

    const result = await client.get<{ value: SharePointDrive[] }>(path, {
      $select: "id,name,webUrl,driveType",
    });

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list drives",
    };
  }
}

export async function listSites(
  client: MicrosoftGraphClient
): Promise<SharePointLookupResult<SharePointSite>> {
  try {
    const result = await client.get<{ value: SharePointSite[] }>("/sites", {
      $search: "*",
      $select: "id,displayName,webUrl",
      $top: "100",
    });

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list sites",
    };
  }
}
