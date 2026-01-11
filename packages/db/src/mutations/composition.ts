import type {
  AgentExecutionStatus,
  AgentExecutionTrace,
  CompositionEvent,
  EmergencePattern,
  EmergencePatternStatus,
  Prisma,
  UserFeedback,
  UserFeedbackType,
} from "../../prisma/generated/client";
import type { Database } from "../index";

export interface CreateCompositionEventInput {
  signature: string;
  sessionId: string;
  teamId: string;
  userId: string;
  toolSequence: string[];
  toolCount: number;
  success: boolean;
  latencyMs: number;
  userSatisfied?: boolean;
  feedbackId?: string;
  promptCategory?: string;
  entityTypes?: string[];
  metadata?: Prisma.InputJsonValue;
  timestamp?: Date;
}

export interface UpsertEmergencePatternInput {
  signature: string;
  toolSequence: string[];
  sequenceLength: number;
  success: boolean;
  latencyMs: number;
  promptCategory?: string;
}

export interface CompositionLogResult {
  eventId: string;
  patternFrequency: number;
}

export function createCompositionEvent(
  db: Database,
  data: CreateCompositionEventInput
): Promise<CompositionEvent> {
  return db.compositionEvent.create({
    data: {
      signature: data.signature,
      sessionId: data.sessionId,
      teamId: data.teamId,
      userId: data.userId,
      toolSequence: data.toolSequence,
      toolCount: data.toolCount,
      success: data.success,
      latencyMs: data.latencyMs,
      userSatisfied: data.userSatisfied,
      feedbackId: data.feedbackId,
      promptCategory: data.promptCategory,
      entityTypes: data.entityTypes ?? [],
      metadata: data.metadata,
      timestamp: data.timestamp ?? new Date(),
    },
  });
}

export async function createCompositionEventWithPattern(
  db: Database,
  event: CreateCompositionEventInput,
  pattern: UpsertEmergencePatternInput
): Promise<CompositionLogResult> {
  const now = new Date();

  return await db.$transaction(async (tx) => {
    const createdEvent = await tx.compositionEvent.create({
      data: {
        signature: event.signature,
        sessionId: event.sessionId,
        teamId: event.teamId,
        userId: event.userId,
        toolSequence: event.toolSequence,
        toolCount: event.toolCount,
        success: event.success,
        latencyMs: event.latencyMs,
        userSatisfied: event.userSatisfied,
        feedbackId: event.feedbackId,
        promptCategory: event.promptCategory,
        entityTypes: event.entityTypes ?? [],
        metadata: event.metadata,
        timestamp: event.timestamp ?? now,
      },
      select: { id: true },
    });

    const upsertedPattern = await tx.emergencePattern.upsert({
      where: { signature: pattern.signature },
      create: {
        signature: pattern.signature,
        toolSequence: pattern.toolSequence,
        sequenceLength: pattern.sequenceLength,
        frequency: 1,
        successCount: pattern.success ? 1 : 0,
        failureCount: pattern.success ? 0 : 1,
        successRate: pattern.success ? 1.0 : 0.0,
        avgLatencyMs: pattern.latencyMs,
        p95LatencyMs: pattern.latencyMs,
        firstSeen: now,
        lastSeen: now,
        status: "OBSERVED",
        examples: JSON.stringify([
          {
            prompt: pattern.promptCategory ?? "unknown",
            outcome: pattern.success ? "success" : "failure",
            timestamp: Date.now(),
          },
        ]),
      },
      update: {
        frequency: { increment: 1 },
        successCount: pattern.success ? { increment: 1 } : undefined,
        failureCount: pattern.success ? undefined : { increment: 1 },
        lastSeen: now,
      },
      select: { frequency: true },
    });

    return {
      eventId: createdEvent.id,
      patternFrequency: upsertedPattern.frequency,
    };
  });
}

export function createCompositionEventBatch(
  db: Database,
  events: CreateCompositionEventInput[]
): Promise<{ count: number }> {
  return db.compositionEvent.createMany({
    data: events.map((data) => ({
      signature: data.signature,
      sessionId: data.sessionId,
      teamId: data.teamId,
      userId: data.userId,
      toolSequence: data.toolSequence,
      toolCount: data.toolCount,
      success: data.success,
      latencyMs: data.latencyMs,
      userSatisfied: data.userSatisfied,
      feedbackId: data.feedbackId,
      promptCategory: data.promptCategory,
      entityTypes: data.entityTypes ?? [],
      metadata: data.metadata,
      timestamp: data.timestamp ?? new Date(),
    })),
    skipDuplicates: true,
  });
}

export interface UpdateEmergencePatternStatusInput {
  signature: string;
  status: EmergencePatternStatus;
  formalizedAs?: string;
  rejectionReason?: string;
  reviewedBy?: string;
}

export function updateEmergencePatternStatus(
  db: Database,
  data: UpdateEmergencePatternStatusInput
): Promise<EmergencePattern> {
  return db.emergencePattern.update({
    where: { signature: data.signature },
    data: {
      status: data.status,
      formalizedAs: data.formalizedAs,
      rejectionReason: data.rejectionReason,
      reviewedAt: new Date(),
      reviewedBy: data.reviewedBy,
    },
  });
}

export interface CreateUserFeedbackInput {
  teamId: string;
  userId: string;
  sessionId: string;
  traceId?: string;
  compositionId?: string;
  type: UserFeedbackType;
  rating?: number;
  comment?: string;
  correction?: string;
  promptSummary?: string;
  responseSummary?: string;
  metadata?: Prisma.InputJsonValue;
}

export function createUserFeedback(
  db: Database,
  data: CreateUserFeedbackInput
): Promise<UserFeedback> {
  return db.userFeedback.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      sessionId: data.sessionId,
      traceId: data.traceId,
      compositionId: data.compositionId,
      type: data.type,
      rating: data.rating,
      comment: data.comment,
      correction: data.correction,
      promptSummary: data.promptSummary,
      responseSummary: data.responseSummary,
      metadata: data.metadata,
    },
  });
}

export function markUserFeedbackProcessed(
  db: Database,
  feedbackId: string
): Promise<UserFeedback> {
  return db.userFeedback.update({
    where: { id: feedbackId },
    data: {
      processed: true,
      processedAt: new Date(),
    },
  });
}

export function linkFeedbackToComposition(
  db: Database,
  feedbackId: string,
  compositionId: string,
  satisfied: boolean
): Promise<CompositionEvent> {
  return db.compositionEvent.update({
    where: { id: compositionId },
    data: {
      feedbackId,
      userSatisfied: satisfied,
    },
  });
}

export interface CreateAgentExecutionTraceInput {
  teamId: string;
  userId: string;
  sessionId: string;
  agentName: string;
  agentType: string;
  inputPrompt: string;
  parentTraceId?: string;
  metadata?: Prisma.InputJsonValue;
}

export function createAgentExecutionTrace(
  db: Database,
  data: CreateAgentExecutionTraceInput
): Promise<AgentExecutionTrace> {
  return db.agentExecutionTrace.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      sessionId: data.sessionId,
      agentName: data.agentName,
      agentType: data.agentType,
      inputPrompt: data.inputPrompt,
      parentTraceId: data.parentTraceId,
      metadata: data.metadata,
      status: "RUNNING",
    },
  });
}

export interface CompleteAgentExecutionTraceInput {
  traceId: string;
  status: AgentExecutionStatus;
  completionSignal?: string;
  outputResult?: Prisma.InputJsonValue;
  toolCalls?: Prisma.InputJsonValue;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  toolCallCount?: number;
}

export function completeAgentExecutionTrace(
  db: Database,
  data: CompleteAgentExecutionTraceInput
): Promise<AgentExecutionTrace> {
  return db.agentExecutionTrace.update({
    where: { id: data.traceId },
    data: {
      status: data.status,
      completionSignal: data.completionSignal,
      outputResult: data.outputResult,
      toolCalls: data.toolCalls,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      latencyMs: data.latencyMs,
      toolCallCount: data.toolCallCount,
      completedAt: new Date(),
    },
  });
}

export function deleteOldCompositionEvents(
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<{ count: number }> {
  return db.compositionEvent.deleteMany({
    where: {
      teamId,
      createdAt: { lt: olderThan },
    },
  });
}

export function deleteOldAgentExecutionTraces(
  db: Database,
  teamId: string,
  olderThan: Date
): Promise<{ count: number }> {
  return db.agentExecutionTrace.deleteMany({
    where: {
      teamId,
      startedAt: { lt: olderThan },
    },
  });
}
