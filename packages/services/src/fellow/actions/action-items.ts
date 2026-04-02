import type { FellowClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function completeActionItem(
  client: FellowClient,
  actionItemId: string
): Promise<ActionResult> {
  try {
    await client.post<Record<string, unknown>>(
      `/action-item/${actionItemId}/complete`,
      {}
    );
    return { success: true, id: actionItemId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to complete action item",
    };
  }
}

export async function archiveActionItem(
  client: FellowClient,
  actionItemId: string
): Promise<ActionResult> {
  try {
    await client.post<Record<string, unknown>>(
      `/action-item/${actionItemId}/archive`,
      {}
    );
    return { success: true, id: actionItemId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to archive action item",
    };
  }
}
