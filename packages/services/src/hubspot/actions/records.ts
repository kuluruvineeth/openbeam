import type { HubSpotClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

const PORTAL_URL = "https://app.hubspot.com/contacts";

export async function createHubSpotRecord(
  client: HubSpotClient,
  objectType: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ id: string }>(
      `/crm/v3/objects/${objectType}`,
      { properties }
    );

    return {
      success: true,
      recordId: result.id,
      url: `${PORTAL_URL}/${client.portalId}/${objectType}/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create record",
    };
  }
}

export async function updateHubSpotRecord(
  client: HubSpotClient,
  objectType: string,
  recordId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.patch(`/crm/v3/objects/${objectType}/${recordId}`, {
      properties,
    });
    return {
      success: true,
      recordId,
      url: `${PORTAL_URL}/${client.portalId}/${objectType}/${recordId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update record",
    };
  }
}
