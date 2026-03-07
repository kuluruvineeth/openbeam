import {
  aggregateControlCosts,
  createControlCostEvent,
  type Database,
  findControlAgentById,
  incrementTeamConsumedCents,
  listControlCostEvents,
  updateControlAgentStatus,
  updateTeamBudget,
} from "@openbeam/db";
import type { CreateControlCostEventInput } from "@openbeam/types/control/validators/costs";
import { ControlServiceError } from "./errors";

export async function recordControlCostEvent(
  db: Database,
  teamId: string,
  input: CreateControlCostEventInput
) {
  const agent = await findControlAgentById(db, input.agentId, teamId);
  if (!agent) {
    throw ControlServiceError.notFound("Agent");
  }

  const event = await createControlCostEvent(db, {
    teamId,
    agentId: input.agentId,
    issueId: input.issueId ?? undefined,
    projectId: input.projectId ?? undefined,
    goalId: input.goalId ?? undefined,
    billingCode: input.billingCode ?? undefined,
    provider: input.provider,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    costCents: input.costCents,
    occurredAt: input.occurredAt,
  });

  if (input.costCents > 0) {
    await incrementTeamConsumedCents(db, teamId, input.costCents);
  }

  if (
    agent.budgetMonthlyCents > 0 &&
    agent.spentMonthlyCents + input.costCents >= agent.budgetMonthlyCents
  ) {
    await updateControlAgentStatus(db, input.agentId, teamId, "PAUSED");
  }

  return event;
}

export async function listControlCostEventsForTeam(
  db: Database,
  teamId: string,
  options?: {
    agentId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  return await listControlCostEvents(db, teamId, options);
}

export async function getControlCostSummaryForTeam(
  db: Database,
  teamId: string,
  range?: { from?: Date; to?: Date }
) {
  const agg = await aggregateControlCosts(db, teamId, {
    startDate: range?.from,
    endDate: range?.to,
  });

  return {
    totalCostCents: agg._sum.costCents ?? 0,
    totalInputTokens: agg._sum.inputTokens ?? 0,
    totalOutputTokens: agg._sum.outputTokens ?? 0,
    eventCount: agg._count,
  };
}

export async function getControlCostByAgentForTeam(
  db: Database,
  teamId: string,
  range?: { from?: Date; to?: Date }
) {
  const events = await listControlCostEvents(db, teamId, {
    startDate: range?.from,
    endDate: range?.to,
    limit: 10_000,
  });

  const byAgent = new Map<
    string,
    {
      costCents: number;
      inputTokens: number;
      outputTokens: number;
      count: number;
    }
  >();

  for (const event of events) {
    const existing = byAgent.get(event.agentId) ?? {
      costCents: 0,
      inputTokens: 0,
      outputTokens: 0,
      count: 0,
    };
    existing.costCents += event.costCents;
    existing.inputTokens += event.inputTokens;
    existing.outputTokens += event.outputTokens;
    existing.count += 1;
    byAgent.set(event.agentId, existing);
  }

  return [...byAgent.entries()].map(([agentId, data]) => ({
    agentId,
    ...data,
  }));
}

export async function updateControlBudgetForTeam(
  db: Database,
  teamId: string,
  budgetMonthlyCents: number
) {
  return await updateTeamBudget(db, teamId, budgetMonthlyCents);
}
