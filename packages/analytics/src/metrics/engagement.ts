export interface EngagementMetrics {
  dau: number;
  wau: number;
  mau: number;
  dauWauRatio: number;
  dauMauRatio: number;
  wauMauRatio: number;
  retentionDay1: number;
  retentionDay7: number;
  retentionDay30: number;
  avgSessionDuration: number;
  avgSessionsPerUser: number;
  avgActionsPerSession: number;
}

export function calculateStickiness(dau: number, mau: number): number {
  if (mau === 0) {
    return 0;
  }
  return dau / mau;
}

export function calculateDAUWAURatio(dau: number, wau: number): number {
  if (wau === 0) {
    return 0;
  }
  return dau / wau;
}

export function calculateWAUMAURatio(wau: number, mau: number): number {
  if (mau === 0) {
    return 0;
  }
  return wau / mau;
}

export function calculateRetention(
  cohortSize: number,
  retainedUsers: number
): number {
  if (cohortSize === 0) {
    return 0;
  }
  return retainedUsers / cohortSize;
}

export function calculateAllEngagementMetrics(data: {
  dau: number;
  wau: number;
  mau: number;
  retainedDay1: number;
  retainedDay7: number;
  retainedDay30: number;
  cohortSize: number;
  totalSessionDuration: number;
  totalSessions: number;
  totalActions: number;
  uniqueUsers: number;
}): EngagementMetrics {
  return {
    dau: data.dau,
    wau: data.wau,
    mau: data.mau,
    dauWauRatio: calculateDAUWAURatio(data.dau, data.wau),
    dauMauRatio: calculateStickiness(data.dau, data.mau),
    wauMauRatio: calculateWAUMAURatio(data.wau, data.mau),
    retentionDay1: calculateRetention(data.cohortSize, data.retainedDay1),
    retentionDay7: calculateRetention(data.cohortSize, data.retainedDay7),
    retentionDay30: calculateRetention(data.cohortSize, data.retainedDay30),
    avgSessionDuration:
      data.totalSessions > 0
        ? data.totalSessionDuration / data.totalSessions
        : 0,
    avgSessionsPerUser:
      data.uniqueUsers > 0 ? data.totalSessions / data.uniqueUsers : 0,
    avgActionsPerSession:
      data.totalSessions > 0 ? data.totalActions / data.totalSessions : 0,
  };
}

export const ENGAGEMENT_BENCHMARKS = {
  b2bDailyProduct: {
    dauMauRatio: 0.4,
    description: "B2B products with daily use (project mgmt, comms)",
  },
  b2bWeeklyProduct: {
    dauMauRatio: 0.2,
    description: "B2B products with weekly use",
  },
  consumerSocial: {
    dauMauRatio: 0.5,
    description: "Consumer social products",
  },
  saasAverage: {
    dauMauRatio: 0.13,
    description: "Average SaaS product",
  },
} as const;
