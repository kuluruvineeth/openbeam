const TRAILING_SLASHES = /\/+$/;

export function buildDynamics365Url(
  orgUrl: string,
  entityPath: string,
  entityId: string
): string {
  const normalizedUrl = orgUrl.replace(TRAILING_SLASHES, "");
  return `${normalizedUrl}/main.aspx?etn=${entityPath}&id=${entityId}&pagetype=entityrecord`;
}

export function formatODataAnnotation(
  record: Record<string, unknown>,
  field: string
): string | undefined {
  const annotationKey = `${field}@OData.Community.Display.V1.FormattedValue`;
  const value = record[annotationKey];
  return typeof value === "string" ? value : undefined;
}

const PRIORITY_MAP: Record<number, string> = {
  1: "High",
  2: "Normal",
  3: "Low",
};

export function formatPriority(code: number | null): string | undefined {
  if (code === null) {
    return;
  }
  return PRIORITY_MAP[code];
}

const OPPORTUNITY_STATE_MAP: Record<number, string> = {
  0: "Open",
  1: "Won",
  2: "Lost",
};

export function formatOpportunityState(code: number): string {
  return OPPORTUNITY_STATE_MAP[code] ?? "Unknown";
}

const CASE_STATE_MAP: Record<number, string> = {
  0: "Active",
  1: "Resolved",
  2: "Cancelled",
};

export function formatCaseState(code: number): string {
  return CASE_STATE_MAP[code] ?? "Unknown";
}

const LEAD_STATE_MAP: Record<number, string> = {
  0: "Open",
  1: "Qualified",
  2: "Disqualified",
};

export function formatLeadState(code: number): string {
  return LEAD_STATE_MAP[code] ?? "Unknown";
}
