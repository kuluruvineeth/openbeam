import type { SamsaraClient } from "../client";

export interface AlertActionResult {
  success: boolean;
  alertId?: string;
  error?: string;
}

export function resolveAlert(
  _client: SamsaraClient,
  _alertId: string
): AlertActionResult {
  return {
    success: false,
    error: "Alert resolve is not available via Samsara's public API",
  };
}
