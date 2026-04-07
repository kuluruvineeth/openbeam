export interface DatadogMonitorCreateResult {
  id: string | undefined;
}

export interface DatadogMonitorUpdateResult {
  id: string | undefined;
}

export interface DatadogMonitorMuteResult {
  muted: true;
}

export interface DatadogMonitorUnmuteResult {
  unmuted: true;
}

export interface DatadogActionResults {
  monitor_create: DatadogMonitorCreateResult;
  monitor_update: DatadogMonitorUpdateResult;
  monitor_mute: DatadogMonitorMuteResult;
  monitor_unmute: DatadogMonitorUnmuteResult;
}
