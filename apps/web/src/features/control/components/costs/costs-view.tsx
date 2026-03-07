"use client";

import { Separator } from "@openbeam/ui";
import {
  useControlCostEvents,
  useControlCostSummary,
  useControlCostsByAgent,
} from "../../hooks/use-control-costs";
import { CostByAgent } from "./cost-by-agent";
import { CostByProject } from "./cost-by-project";
import { CostSummaryCards } from "./cost-summary-cards";
import { CostsSkeleton } from "./costs-skeleton";

export function CostsView() {
  const { data: summary, isLoading: summaryLoading } = useControlCostSummary();
  const { data: byAgent } = useControlCostsByAgent();
  const { data: events } = useControlCostEvents({ limit: 20 });

  if (summaryLoading || !summary) {
    return <CostsSkeleton />;
  }

  const mappedSummary = {
    totalSpendCents: summary.totalCostCents,
    budgetMonthlyCents: 0,
    burnRateDailyCents: 0,
    projectedMonthEndCents: 0,
  };

  const mappedAgents = (byAgent ?? []).map(
    (a: {
      agentId: string;
      costCents: number;
      count: number;
      inputTokens: number;
      outputTokens: number;
    }) => ({
      agentId: a.agentId,
      agentName: a.agentId,
      totalCents: a.costCents,
      runCount: a.count,
      avgCostPerRunCents: a.count > 0 ? Math.round(a.costCents / a.count) : 0,
    })
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="font-semibold text-lg">Costs</h1>

      <CostSummaryCards summary={mappedSummary} />

      <Separator />

      <CostByAgent agents={mappedAgents} />

      <Separator />

      <CostByProject events={events ?? []} />
    </div>
  );
}
