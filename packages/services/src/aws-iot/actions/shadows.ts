export interface ShadowActionResult {
  success: boolean;
  thingName?: string;
  error?: string;
}

export function updateDeviceShadow(
  _thingName: string,
  _desiredState: Record<string, unknown>
): Promise<ShadowActionResult> {
  return {
    success: false,
    error:
      "Shadow updates require AWS IoT Data Plane API — use AWS SDK directly for now",
  };
}
