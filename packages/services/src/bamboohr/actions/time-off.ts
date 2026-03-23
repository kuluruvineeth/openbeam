import type { BambooHRClient } from "../client";

export interface TimeOffActionResult {
  success: boolean;
  error?: string;
}

export async function requestTimeOff(
  client: BambooHRClient,
  options: {
    employeeId: string;
    start: string;
    end: string;
    timeOffTypeId: string;
    notes?: string;
  }
): Promise<TimeOffActionResult> {
  try {
    await client.put(
      `/employees/${encodeURIComponent(options.employeeId)}/time_off/request`,
      {
        start: options.start,
        end: options.end,
        timeOffTypeId: options.timeOffTypeId,
        notes: options.notes ?? "",
        status: "requested",
      }
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to request time off",
    };
  }
}
