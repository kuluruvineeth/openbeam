import type { WorkdayClient } from "../client";

export interface WorkerActionResult {
  success: boolean;
  workerId?: string;
  error?: string;
}

export function updateWorker(
  _client: WorkdayClient,
  _workerId: string,
  _fields: Record<string, unknown>
): Promise<WorkerActionResult> {
  return Promise.resolve({
    success: false,
    error:
      "Workday worker updates require tenant-specific SOAP/HCM endpoints — contact your Workday admin",
  });
}
