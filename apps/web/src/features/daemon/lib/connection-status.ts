type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error"
  | "unreachable";

type StatusTone = "success" | "warning" | "error" | "muted";

const STATUS_DISPLAY: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Disconnected",
  error: "Connection Error",
  unreachable: "Unreachable",
};

const STATUS_TONE: Record<ConnectionStatus, StatusTone> = {
  connected: "success",
  connecting: "warning",
  disconnected: "muted",
  error: "error",
  unreachable: "error",
};

export function formatConnectionStatus(status: ConnectionStatus): string {
  return STATUS_DISPLAY[status] ?? "Unknown";
}

export function getConnectionStatusTone(status: ConnectionStatus): StatusTone {
  return STATUS_TONE[status] ?? "muted";
}

export type { ConnectionStatus, StatusTone };
