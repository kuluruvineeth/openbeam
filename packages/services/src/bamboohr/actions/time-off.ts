export interface TimeOffActionResult {
  success: boolean;
  error?: string;
}

export function requestTimeOff(
  _employeeId: string,
  _start: string,
  _end: string,
  _timeOffTypeId: string
): Promise<TimeOffActionResult> {
  return Promise.resolve({
    success: false,
    error:
      "BambooHR time off requests require PUT endpoint — needs client extension",
  });
}
