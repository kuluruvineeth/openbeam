import type { MissionEventLedgerItem } from "@openplane/types/mission-control";

type BudgetSnapshot = {
  consumedCents: number;
  budgetCents: number;
  burnRateCentsPerMinute: number;
  perAgentCosts: Record<string, number>;
  lastUpdatedAt: number;
};

type BurnRateDataPoint = {
  timestamp: number;
  cumulativeCents: number;
};

const HOURLY_THRESHOLD_CENTS_PER_MINUTE = 1000;

function extractCostEvents(
  events: MissionEventLedgerItem[]
): MissionEventLedgerItem[] {
  return events.filter((e) => e.eventType === "cost.updated");
}

export function deriveBurnRate(events: MissionEventLedgerItem[]): number {
  const costEvents = extractCostEvents(events);
  if (costEvents.length < 2) {
    return 0;
  }

  const sorted = [...costEvents].sort(
    (a: MissionEventLedgerItem, b: MissionEventLedgerItem) =>
      a.timestamp - b.timestamp
  );
  const first = sorted[0];
  const last = sorted.at(-1);
  if (!last) {
    return 0;
  }
  const durationMinutes = (last.timestamp - first.timestamp) / 60_000;

  if (durationMinutes <= 0) {
    return 0;
  }

  const totalCost = sorted.reduce(
    (sum: number, e: MissionEventLedgerItem) =>
      sum + ((e.payload?.costCents as number) ?? 0),
    0
  );

  return totalCost / durationMinutes;
}

export function projectBudgetExhaustion(
  consumed: number,
  budget: number,
  burnRate: number
): number | null {
  if (burnRate <= 0 || consumed >= budget) {
    return null;
  }

  const remainingCents = budget - consumed;
  const minutesRemaining = remainingCents / burnRate;

  return Date.now() + minutesRemaining * 60_000;
}

export function buildBurnRateTimeline(
  events: MissionEventLedgerItem[]
): BurnRateDataPoint[] {
  const costEvents = [...extractCostEvents(events)].sort(
    (a: MissionEventLedgerItem, b: MissionEventLedgerItem) =>
      a.timestamp - b.timestamp
  );

  let cumulative = 0;
  return costEvents.map((e: MissionEventLedgerItem) => {
    cumulative += (e.payload?.costCents as number) ?? 0;
    return { timestamp: e.timestamp, cumulativeCents: cumulative };
  });
}

export function computeBudgetThreshold(
  consumed: number,
  budget: number
): "safe" | "warning" | "danger" | "exceeded" {
  if (budget <= 0) {
    return consumed > 0 ? "exceeded" : "safe";
  }

  const ratio = consumed / budget;
  if (ratio > 1) {
    return "exceeded";
  }
  if (ratio >= 0.9) {
    return "danger";
  }
  if (ratio >= 0.7) {
    return "warning";
  }
  return "safe";
}

export function formatCents(cents: number): string {
  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const dollars = (absolute / 100).toFixed(2);
  return negative ? `-$${dollars}` : `$${dollars}`;
}

export function formatBurnRate(centsPerMinute: number): string {
  if (centsPerMinute >= HOURLY_THRESHOLD_CENTS_PER_MINUTE) {
    return `${formatCents(centsPerMinute * 60)}/hr`;
  }
  return `${formatCents(centsPerMinute)}/min`;
}

export type { BudgetSnapshot, BurnRateDataPoint };
