export interface WorkerActionResult {
  success: boolean;
  workerId?: string;
  error?: string;
}

export function updateWorker(
  _workerId: string,
  _fields: Record<string, unknown>
): WorkerActionResult {
  return {
    success: false,
    error:
      "Workday REST API does not support generic worker updates via PUT. " +
      "Worker mutations require Workday Web Services (SOAP) or specific " +
      "REST sub-endpoints (e.g., requestTimeOff, changeBusinessTitle).",
  };
}
