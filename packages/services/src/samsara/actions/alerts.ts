import type { SamsaraClient } from "../client";

export interface AlertActionResult {
  success: boolean;
  alertId?: string;
  error?: string;
}

export async function resolveAlert(
  client: SamsaraClient,
  alertId: string
): Promise<AlertActionResult> {
  try {
    await client.post(`/fleet/alerts/${alertId}/resolve`, {});
    return { success: true, alertId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resolve alert",
    };
  }
}
