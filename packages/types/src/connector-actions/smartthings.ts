export interface SmartthingsDeviceCommandResult {
  deviceId: string | undefined;
  status: string | undefined;
}

export interface SmartthingsActionResults {
  device_command: SmartthingsDeviceCommandResult;
}
