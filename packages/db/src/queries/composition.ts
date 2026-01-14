import type {
  AgentExecutionTrace,
  CompositionEvent,
  EmergencePattern,
  EmergencePatternStatus,
  UserFeedback,
  UserFeedbackType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface GetEmergingPatternsOptions {
  minFrequency?: number;
  minSuccessRate?: number;
  status?: EmergencePatternStatus;
  limit?: number;
}

export function getEmergingPatterns(
  db: Database,
  options: GetEmergingPatternsOptions = {}
): Promise<EmergencePattern[]> {
  const {
    minFrequency = 10,
    minSuccessRate = 0.7,
    status = "OBSERVED",
    limit = 20,
  } = options;

  return db.emergencePattern.findMany({
    where: {
      status,
      frequency: { gte: minFrequency },
      successRate: { gte: minSuccessRate },
    },
    orderBy: [{ frequency: "desc" }, { successRate: "desc" }],
    take: limit,
  });
}

export function getPatternBySignature(
  db: Database,
  signature: string
): Promise<EmergencePattern | null> {
  return db.emergencePattern.findUnique({
    where: { signature },
  });
}

export function getTopPatternsByFrequency(
  db: Database,
  options: { limit?: number; status?: EmergencePatternStatus } = {}
): Promise<EmergencePattern[]> {
  const { limit = 20, status } = options;

  return db.emergencePattern.findMany({
    where: status ? { status } : undefined,
    orderBy: { frequency: "desc" },
    take: limit,
  });
}

export function getPatternsPendingReview(
  db: Database,
  options: { minFrequency?: number; limit?: number } = {}
): Promise<EmergencePattern[]> {
  const { minFrequency = 50, limit = 20 } = options;

  return db.emergencePattern.findMany({
    where: {
      status: "OBSERVED",
      frequency: { gte: minFrequency },
      successRate: { gte: 0.8 },
    },
    orderBy: [{ frequency: "desc" }, { successRate: "desc" }],
    take: limit,
  });
}

export interface GetCompositionEventsOptions {
  limit?: number;
  offset?: number;
  success?: boolean;
  promptCategory?: string;
}

export function getCompositionEventsBySession(
  db: Database,
  sessionId: string,
  options: GetCompositionEventsOptions = {}
): Promise<CompositionEvent[]> {
  const { limit = 50, offset = 0, success, promptCategory } = options;

  return db.compositionEvent.findMany({
    where: {
      sessionId,
      success,
      promptCategory,
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getCompositionEventsByTeam(
  db: Database,
  teamId: string,
  options: GetCompositionEventsOptions & {
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<CompositionEvent[]> {
  const {
    limit = 100,
    offset = 0,
    success,
    promptCategory,
    startDate,
    endDate,
  } = options;

  return db.compositionEvent.findMany({
    where: {
      teamId,
      success,
      promptCategory,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getCompositionEventById(
  db: Database,
  id: string
): Promise<CompositionEvent | null> {
  return db.compositionEvent.findUnique({
    where: { id },
  });
}

export interface CompositionStats {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  uniquePatterns: number;
}

export async function getCompositionStatsByTeam(
  db: Database,
  teamId: string,
  options: { startDate?: Date; endDate?: Date } = {}
): Promise<CompositionStats> {
  const { startDate, endDate } = options;

  const whereClause = {
    teamId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  };

  const [totalEvents, successEvents, avgResult, uniquePatterns] =
    await Promise.all([
      db.compositionEvent.count({ where: whereClause }),
      db.compositionEvent.count({ where: { ...whereClause, success: true } }),
      db.compositionEvent.aggregate({
        where: whereClause,
        _avg: { latencyMs: true },
      }),
      db.compositionEvent.groupBy({
        by: ["signature"],
        where: whereClause,
      }),
    ]);

  return {
    totalEvents,
    successCount: successEvents,
    failureCount: totalEvents - successEvents,
    avgLatencyMs: avgResult._avg?.latencyMs ?? 0,
    uniquePatterns: uniquePatterns.length,
  };
}

export interface GetUserFeedbackOptions {
  type?: UserFeedbackType;
  processed?: boolean;
  limit?: number;
  offset?: number;
}

export function getUserFeedbackByTeam(
  db: Database,
  teamId: string,
  options: GetUserFeedbackOptions = {}
): Promise<UserFeedback[]> {
  const { type, processed, limit = 50, offset = 0 } = options;

  return db.userFeedback.findMany({
    where: {
      teamId,
      type,
      processed,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export function getUnprocessedCorrections(
  db: Database,
  teamId: string,
  limit = 100
): Promise<UserFeedback[]> {
  return db.userFeedback.findMany({
    where: {
      teamId,
      type: "CORRECTION",
      processed: false,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
}

export function getUserFeedbackById(
  db: Database,
  id: string
): Promise<UserFeedback | null> {
  return db.userFeedback.findUnique({
    where: { id },
  });
}

export function getAgentExecutionTraceById(
  db: Database,
  id: string
): Promise<AgentExecutionTrace | null> {
  return db.agentExecutionTrace.findUnique({
    where: { id },
    include: {
      childTraces: true,
    },
  });
}

export function getAgentExecutionTracesBySession(
  db: Database,
  sessionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<AgentExecutionTrace[]> {
  const { limit = 50, offset = 0 } = options;

  return db.agentExecutionTrace.findMany({
    where: { sessionId },
    orderBy: { startedAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      childTraces: true,
    },
  });
}

export function getAgentExecutionTracesByTeam(
  db: Database,
  teamId: string,
  options: {
    agentName?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<AgentExecutionTrace[]> {
  const {
    agentName,
    status,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  return db.agentExecutionTrace.findMany({
    where: {
      teamId,
      agentName,
      status: status as AgentExecutionTrace["status"] | undefined,
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { startedAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function getRecentToolSequences(
  db: Database,
  teamId: string,
  limit = 10
): Promise<{ toolSequence: string[]; count: number }[]> {
  const results = await db.compositionEvent.groupBy({
    by: ["signature"],
    where: { teamId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const patterns = await db.emergencePattern.findMany({
    where: {
      signature: { in: results.map((r) => r.signature) },
    },
    select: {
      signature: true,
      toolSequence: true,
    },
  });

  const patternMap = new Map(
    patterns.map((p) => [p.signature, p.toolSequence])
  );

  return results.map((r) => ({
    toolSequence: patternMap.get(r.signature) ?? [],
    count: r._count.id,
  }));
}
