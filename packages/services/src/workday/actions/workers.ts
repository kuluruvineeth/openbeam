import type { WorkdayClient } from "../client";

export interface WorkerActionResult {
  success: boolean;
  workerId?: string;
  error?: string;
}

export async function updateWorker(
  client: WorkdayClient,
  workerId: string,
  fields: Record<string, unknown>
): Promise<WorkerActionResult> {
  try {
    await client.put(`/workers/${encodeURIComponent(workerId)}`, fields);
    return { success: true, workerId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update worker",
    };
  }
}
