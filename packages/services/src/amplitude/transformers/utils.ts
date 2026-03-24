export function buildAmplitudeChartUrl(
  orgSlug: string | undefined,
  chartId: number
): string {
  if (orgSlug) {
    return `https://analytics.amplitude.com/${orgSlug}/chart/${chartId}`;
  }
  return `https://analytics.amplitude.com/chart/${chartId}`;
}

export function buildAmplitudeDashboardUrl(
  orgSlug: string | undefined,
  dashboardId: number
): string {
  if (orgSlug) {
    return `https://analytics.amplitude.com/${orgSlug}/dashboard/${dashboardId}`;
  }
  return `https://analytics.amplitude.com/dashboard/${dashboardId}`;
}

export function buildAmplitudeCohortUrl(
  orgSlug: string | undefined,
  cohortId: string
): string {
  if (orgSlug) {
    return `https://analytics.amplitude.com/${orgSlug}/cohort/${cohortId}`;
  }
  return `https://analytics.amplitude.com/cohort/${cohortId}`;
}

export function formatChartType(chartType: string): string {
  const map: Record<string, string> = {
    event_segmentation: "Event Segmentation",
    funnel_analysis: "Funnel Analysis",
    retention_analysis: "Retention Analysis",
    user_sessions: "User Sessions",
    user_composition: "User Composition",
    revenue_analysis: "Revenue Analysis",
    stickiness: "Stickiness",
    lifecycle: "Lifecycle",
    pathfinder: "Pathfinder",
    impact_analysis: "Impact Analysis",
  };
  return map[chartType] ?? chartType;
}
