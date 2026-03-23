import {
  DATADOG_APP_SITES,
  type DatadogSite,
} from "@openbeam/types/services/connectors/datadog";

export function buildDatadogUrl(site: DatadogSite, path: string): string {
  const appBase = DATADOG_APP_SITES[site] ?? DATADOG_APP_SITES.us1;
  return `${appBase}${path}`;
}

export function formatMonitorStatus(status: string): string {
  const map: Record<string, string> = {
    OK: "OK",
    Alert: "Alerting",
    Warn: "Warning",
    "No Data": "No Data",
    Unknown: "Unknown",
    Ignored: "Ignored",
    Skipped: "Skipped",
  };
  return map[status] ?? status;
}

export function formatIncidentSeverity(severity: string): string {
  const map: Record<string, string> = {
    SEV_1: "SEV-1 (Critical)",
    SEV_2: "SEV-2 (High)",
    SEV_3: "SEV-3 (Moderate)",
    SEV_4: "SEV-4 (Low)",
    SEV_5: "SEV-5 (Minor)",
    UNKNOWN: "Unknown",
  };
  return map[severity] ?? severity;
}

export function formatSloType(type: string): string {
  const map: Record<string, string> = {
    metric: "Metric-based",
    monitor: "Monitor-based",
    time_slice: "Time-slice",
  };
  return map[type] ?? type;
}
