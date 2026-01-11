import prisma, {
  type CreateCompositionEventInput,
  createCompositionEvent,
  getCompositionEventsByTeam,
  getEmergingPatterns,
  updateEmergencePatternStatus,
} from "@openplane/db";
import type {
  CompositionEvent,
  EmergenceDetectionJobData,
  EmergencePattern,
} from "@openplane/redis";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface EmergenceDetectionResult {
  patternsAnalyzed: number;
  newPatterns: number;
  validatedPatterns: number;
  formalizationCandidates: EmergencePattern[];
  durationMs: number;
}

export async function processEmergenceDetectionJob(
  job: Job<EmergenceDetectionJobData>
): Promise<EmergenceDetectionResult> {
  const span = tracer.startSpan("emergence-detection.process", {
    attributes: {
      "job.id": job.id ?? "",
      "job.type": job.data.type,
      "team.id": job.data.teamId ?? "all",
    },
  });

  try {
    logJobStart("emergence-detection", job.id, {
      type: job.data.type,
      teamId: job.data.teamId,
    });

    let result: EmergenceDetectionResult;

    switch (job.data.type) {
      case "WEEKLY_ANALYSIS":
        result = await runWeeklyAnalysis(job.data);
        break;
      case "COMPOSITION_AGGREGATION":
        result = await runCompositionAggregation(job.data);
        break;
      case "PATTERN_VALIDATION":
        result = await runPatternValidation(job.data);
        break;
      default:
        throw new Error(`Unknown job type: ${job.data.type}`);
    }

    span.setAttributes({
      "result.patterns_analyzed": result.patternsAnalyzed,
      "result.new_patterns": result.newPatterns,
      "result.validated_patterns": result.validatedPatterns,
      "result.formalization_candidates": result.formalizationCandidates.length,
      "result.duration_ms": result.durationMs,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

async function runWeeklyAnalysis(
  data: EmergenceDetectionJobData
): Promise<EmergenceDetectionResult> {
  const startTime = Date.now();
  logger.info({ teamId: data.teamId }, "Starting weekly emergence analysis");

  const dateRange = data.dateRange ?? {
    start: Date.now() - 7 * 24 * 60 * 60 * 1000,
    end: Date.now(),
  };

  const compositions = await getCompositionEvents(data.teamId, dateRange);
  logger.info({ count: compositions.length }, "Loaded composition events");

  const patterns = aggregatePatterns(compositions);
  logger.info({ count: patterns.length }, "Aggregated patterns");

  const minFrequency = data.minFrequency ?? 50;
  const minSuccessRate = data.minSuccessRate ?? 0.8;

  const formalizationCandidates = patterns.filter(
    (p) =>
      p.frequency >= minFrequency &&
      p.successRate >= minSuccessRate &&
      p.status === "observed"
  );

  for (const candidate of formalizationCandidates) {
    candidate.status = "validated";
  }

  await savePatterns(patterns);

  if (formalizationCandidates.length > 0) {
    logger.info(
      {
        count: formalizationCandidates.length,
        patterns: formalizationCandidates.map((p) => ({
          signature: p.signature,
          sequence: p.toolSequence,
          frequency: p.frequency,
          successRate: p.successRate,
        })),
      },
      "Found formalization candidates"
    );
  }

  const result: EmergenceDetectionResult = {
    patternsAnalyzed: patterns.length,
    newPatterns: patterns.filter((p) => p.status === "observed").length,
    validatedPatterns: formalizationCandidates.length,
    formalizationCandidates,
    durationMs: Date.now() - startTime,
  };

  logger.info(result, "Weekly emergence analysis completed");
  return result;
}

async function runCompositionAggregation(
  data: EmergenceDetectionJobData
): Promise<EmergenceDetectionResult> {
  const startTime = Date.now();

  if (!(data.teamId && data.dateRange)) {
    throw new Error(
      "teamId and dateRange required for composition aggregation"
    );
  }

  logger.info(
    { teamId: data.teamId, dateRange: data.dateRange },
    "Starting composition aggregation"
  );

  const compositions = await getCompositionEvents(data.teamId, data.dateRange);
  const patterns = aggregatePatterns(compositions);

  await savePatterns(patterns);

  return {
    patternsAnalyzed: patterns.length,
    newPatterns: patterns.length,
    validatedPatterns: 0,
    formalizationCandidates: [],
    durationMs: Date.now() - startTime,
  };
}

async function runPatternValidation(
  _data: EmergenceDetectionJobData
): Promise<EmergenceDetectionResult> {
  const startTime = Date.now();

  logger.info("Starting pattern validation");

  const existingPatterns = await loadPatterns();
  const validatedPatterns = existingPatterns.filter(
    (p) => p.status === "validated"
  );

  return {
    patternsAnalyzed: existingPatterns.length,
    newPatterns: 0,
    validatedPatterns: validatedPatterns.length,
    formalizationCandidates: validatedPatterns,
    durationMs: Date.now() - startTime,
  };
}

function createSignature(toolSequence: string[]): string {
  return toolSequence.sort().join("→");
}

function createExample(composition: CompositionEvent) {
  return {
    prompt: composition.promptCategory,
    outcome: (composition.success ? "success" : "failure") as
      | "success"
      | "failure",
    timestamp: composition.timestamp,
  };
}

function updatePatternStats(
  pattern: EmergencePattern,
  composition: CompositionEvent
): void {
  pattern.frequency += 1;
  pattern.avgLatencyMs =
    (pattern.avgLatencyMs * (pattern.frequency - 1) + composition.latencyMs) /
    pattern.frequency;
  pattern.lastSeen = Math.max(pattern.lastSeen, composition.timestamp);

  const prevSuccessCount = Math.round(
    pattern.successRate * (pattern.frequency - 1)
  );
  const newSuccessCount = composition.success
    ? prevSuccessCount + 1
    : prevSuccessCount;
  pattern.successRate = newSuccessCount / pattern.frequency;

  if (pattern.examples.length < 5) {
    pattern.examples.push(createExample(composition));
  }
}

function createNewPattern(
  signature: string,
  composition: CompositionEvent
): EmergencePattern {
  return {
    signature,
    toolSequence: composition.toolSequence,
    frequency: 1,
    successRate: composition.success ? 1 : 0,
    avgLatencyMs: composition.latencyMs,
    firstSeen: composition.timestamp,
    lastSeen: composition.timestamp,
    status: "observed",
    examples: [createExample(composition)],
  };
}

function aggregatePatterns(
  compositions: CompositionEvent[]
): EmergencePattern[] {
  const patternMap = new Map<string, EmergencePattern>();

  for (const composition of compositions) {
    const signature = createSignature(composition.toolSequence);
    const existing = patternMap.get(signature);

    if (existing) {
      updatePatternStats(existing, composition);
    } else {
      patternMap.set(signature, createNewPattern(signature, composition));
    }
  }

  return Array.from(patternMap.values());
}

async function getCompositionEvents(
  teamId: string | undefined,
  dateRange: { start: number; end: number }
): Promise<CompositionEvent[]> {
  logger.debug(
    { teamId, dateRange },
    "Loading composition events from storage"
  );

  if (!teamId) {
    logger.warn("No teamId provided, returning empty events");
    return [];
  }

  const dbEvents = await getCompositionEventsByTeam(prisma, teamId, {
    startDate: new Date(dateRange.start),
    endDate: new Date(dateRange.end),
    limit: 10_000,
  });

  return dbEvents.map((e) => ({
    sessionId: e.sessionId,
    teamId: e.teamId,
    userId: e.userId,
    toolSequence: e.toolSequence,
    success: e.success,
    latencyMs: e.latencyMs,
    promptCategory: e.promptCategory ?? "",
    timestamp: e.timestamp.getTime(),
  }));
}

async function savePatterns(patterns: EmergencePattern[]): Promise<void> {
  logger.debug({ count: patterns.length }, "Saving emergence patterns");

  for (const pattern of patterns) {
    if (pattern.status === "validated") {
      await updateEmergencePatternStatus(prisma, {
        signature: pattern.signature,
        status: "VALIDATED",
      });
    }
  }
}

async function loadPatterns(): Promise<EmergencePattern[]> {
  logger.debug("Loading existing emergence patterns");

  const dbPatterns = await getEmergingPatterns(prisma, {
    limit: 1000,
    minFrequency: 1,
    minSuccessRate: 0,
    status: "OBSERVED",
  });

  return dbPatterns.map((p) => ({
    signature: p.signature,
    toolSequence: p.toolSequence,
    frequency: p.frequency,
    successRate: p.successRate,
    avgLatencyMs: p.avgLatencyMs,
    firstSeen: p.firstSeen.getTime(),
    lastSeen: p.lastSeen.getTime(),
    status: p.status.toLowerCase() as "observed" | "validated",
    examples: [],
  }));
}

export async function recordCompositionEvent(
  event: CompositionEvent
): Promise<void> {
  logger.debug(
    {
      sessionId: event.sessionId,
      toolSequence: event.toolSequence,
      success: event.success,
    },
    "Recording composition event"
  );

  const signature = event.toolSequence.sort().join("→");

  const input: CreateCompositionEventInput = {
    signature,
    sessionId: event.sessionId,
    teamId: event.teamId,
    userId: event.userId,
    toolSequence: event.toolSequence,
    toolCount: event.toolSequence.length,
    success: event.success,
    latencyMs: event.latencyMs,
    promptCategory: event.promptCategory,
    timestamp: new Date(event.timestamp),
  };

  await createCompositionEvent(prisma, input);
}

export function triggerEmergenceAnalysisManual(): Promise<EmergenceDetectionResult> {
  return runWeeklyAnalysis({
    type: "WEEKLY_ANALYSIS",
    triggeredAt: Date.now(),
    minFrequency: 50,
    minSuccessRate: 0.8,
  });
}
