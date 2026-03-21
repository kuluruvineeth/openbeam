import type { SamsaraClient } from "../client";

export interface DriverMessageResult {
  success: boolean;
  error?: string;
}

export async function sendDriverMessage(
  client: SamsaraClient,
  driverId: string,
  message: string
): Promise<DriverMessageResult> {
  try {
    await client.post("/fleet/messages", {
      driverIds: [driverId],
      message,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send message",
    };
  }
}
