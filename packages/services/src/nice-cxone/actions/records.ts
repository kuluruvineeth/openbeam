import type { NiceCxoneClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function addContactNote(
  client: NiceCxoneClient,
  contactId: string,
  note: string
): Promise<RecordActionResult> {
  try {
    await client.post(`/interactions/${contactId}/notes`, { note });
    return {
      success: true,
      recordId: contactId,
      url: `${client.baseUrl}/#/contacts/${contactId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to add contact note",
    };
  }
}

export async function createContactSignal(
  client: NiceCxoneClient,
  skillId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ contactId: number }>(
      `/skills/${skillId}/contacts`,
      properties
    );
    return {
      success: true,
      recordId: String(result.contactId),
      url: `${client.baseUrl}/#/contacts/${result.contactId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create contact signal",
    };
  }
}

export async function updateAgentState(
  client: NiceCxoneClient,
  agentId: string,
  state: string
): Promise<RecordActionResult> {
  try {
    await client.post(`/agents/${agentId}/state`, { state });
    return {
      success: true,
      recordId: agentId,
      url: `${client.baseUrl}/#/agents/${agentId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update agent state",
    };
  }
}
