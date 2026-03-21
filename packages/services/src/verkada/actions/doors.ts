import type { VerkadaClient } from "../client";

export interface DoorActionResult {
  success: boolean;
  doorId?: string;
  error?: string;
}

export async function unlockDoor(
  client: VerkadaClient,
  doorId: string
): Promise<DoorActionResult> {
  try {
    await client.post(`/access/v1/doors/${doorId}/unlock`, {});
    return { success: true, doorId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unlock door",
    };
  }
}

export async function lockDoor(
  client: VerkadaClient,
  doorId: string
): Promise<DoorActionResult> {
  try {
    await client.post(`/access/v1/doors/${doorId}/lock`, {});
    return { success: true, doorId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to lock door",
    };
  }
}
