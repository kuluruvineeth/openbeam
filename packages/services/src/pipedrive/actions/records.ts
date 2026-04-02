import type { PipedriveClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createPipedriveDeal(
  client: PipedriveClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      success: boolean;
      data: { id: number };
    }>("/deals", properties);
    return {
      success: true,
      recordId: String(result.data.id),
      url: `https://${client.companyDomain}.pipedrive.com/deal/${result.data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create deal",
    };
  }
}

export async function updatePipedriveDeal(
  client: PipedriveClient,
  dealId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.put<{ success: boolean; data: { id: number } }>(
      `/deals/${dealId}`,
      properties
    );
    return {
      success: true,
      recordId: dealId,
      url: `https://${client.companyDomain}.pipedrive.com/deal/${dealId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update deal",
    };
  }
}

export async function createPipedrivePerson(
  client: PipedriveClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      success: boolean;
      data: { id: number };
    }>("/persons", properties);
    return {
      success: true,
      recordId: String(result.data.id),
      url: `https://${client.companyDomain}.pipedrive.com/person/${result.data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create person",
    };
  }
}

export async function createPipedriveNote(
  client: PipedriveClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      success: boolean;
      data: { id: number };
    }>("/notes", properties);
    return {
      success: true,
      recordId: String(result.data.id),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

export async function createPipedriveActivity(
  client: PipedriveClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{
      success: boolean;
      data: { id: number };
    }>("/activities", properties);
    return {
      success: true,
      recordId: String(result.data.id),
      url: `https://${client.companyDomain}.pipedrive.com/activity/${result.data.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create activity",
    };
  }
}
