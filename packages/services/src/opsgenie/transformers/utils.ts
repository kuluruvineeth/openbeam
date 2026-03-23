export function buildOpsGenieAlertUrl(alertId: string): string {
  return `https://app.opsgenie.com/alert/detail/${alertId}/details`;
}

export function buildOpsGenieIncidentUrl(incidentId: string): string {
  return `https://app.opsgenie.com/incident/detail/${incidentId}`;
}

export function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    P1: "Critical",
    P2: "High",
    P3: "Moderate",
    P4: "Low",
    P5: "Informational",
  };
  return map[priority] ?? priority;
}
