import type { PanoptoClient } from "../client";

export interface RecordActionResult {
  success: boolean;
  recordId?: string;
  url?: string;
  error?: string;
}

export async function createPanoptoFolder(
  client: PanoptoClient,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    const result = await client.post<{ Id: string; Name: string }>(
      "/folders",
      properties
    );
    return {
      success: true,
      recordId: result.Id,
      url: `${client.instanceUrl}/Panopto/Pages/Sessions/List.aspx#folderID="${result.Id}"`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create folder",
    };
  }
}

export async function updatePanoptoSession(
  client: PanoptoClient,
  sessionId: string,
  properties: Record<string, unknown>
): Promise<RecordActionResult> {
  try {
    await client.put<{ Id: string }>(`/sessions/${sessionId}`, properties);
    return {
      success: true,
      recordId: sessionId,
      url: `${client.instanceUrl}/Panopto/Pages/Viewer.aspx?id=${sessionId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update session",
    };
  }
}

export async function movePanoptoSession(
  client: PanoptoClient,
  sessionId: string,
  folderId: string
): Promise<RecordActionResult> {
  try {
    await client.put<{ Id: string }>(`/sessions/${sessionId}`, {
      FolderId: folderId,
    });
    return {
      success: true,
      recordId: sessionId,
      url: `${client.instanceUrl}/Panopto/Pages/Viewer.aspx?id=${sessionId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to move session",
    };
  }
}
