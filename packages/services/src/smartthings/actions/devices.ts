import type { SmartThingsClient } from "../client";

export interface DeviceCommandResult {
  success: boolean;
  deviceId?: string;
  status?: string;
  error?: string;
}

export async function executeCommand(
  client: SmartThingsClient,
  options: {
    deviceId: string;
    capability: string;
    command: string;
    args?: unknown[];
  }
): Promise<DeviceCommandResult> {
  try {
    const result = await client.executeDeviceCommand(
      options.deviceId,
      options.capability,
      options.command,
      options.args
    );

    const status = result.results[0]?.status ?? "UNKNOWN";

    return {
      success: status === "ACCEPTED" || status === "COMPLETED",
      deviceId: options.deviceId,
      status,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to execute command",
    };
  }
}
