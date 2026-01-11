import { createHash } from "node:crypto";
import db, {
  createCompositionEventWithPattern,
  getEmergingPatterns as dbGetEmergingPatterns,
  type GetEmergingPatternsOptions,
} from "@openplane/db";
import { z } from "zod";
import { aiMetrics } from "./metrics";

const CompositionEventInputSchema = z.object({
  sessionId: z.string().min(1, "sessionId required"),
  teamId: z.string().min(1, "teamId required"),
  userId: z.string().min(1, "userId required"),
  toolSequence: z.array(z.string().min(1)).min(1, "At least one tool required"),
  success: z.boolean(),
  latencyMs: z.number().int().min(0),
  timestamp: z.number().int().min(0),
  promptCategory: z.string().optional(),
  entityTypes: z.array(z.string()).default([]),
});

export type CompositionEventInput = z.infer<typeof CompositionEventInputSchema>;

export interface CompositionLogResult {
  eventId: string;
  signature: string;
  patternFrequency: number;
}

const SIGNATURE_DELIMITER = "→";

export function generateSignature(toolSequence: readonly string[]): string {
  const normalized = toolSequence.map((t) => t.trim().toLowerCase());
  return createHash("sha256")
    .update(normalized.join(SIGNATURE_DELIMITER))
    .digest("hex")
    .slice(0, 32);
}

export async function logComposition(
  input: unknown
): Promise<CompositionLogResult> {
  const validated = CompositionEventInputSchema.parse(input);
  const signature = generateSignature(validated.toolSequence);

  const result = await createCompositionEventWithPattern(
    db,
    {
      signature,
      sessionId: validated.sessionId,
      teamId: validated.teamId,
      userId: validated.userId,
      toolSequence: validated.toolSequence,
      toolCount: validated.toolSequence.length,
      success: validated.success,
      latencyMs: validated.latencyMs,
      promptCategory: validated.promptCategory,
      entityTypes: validated.entityTypes,
      timestamp: new Date(validated.timestamp),
    },
    {
      signature,
      toolSequence: validated.toolSequence,
      sequenceLength: validated.toolSequence.length,
      success: validated.success,
      latencyMs: validated.latencyMs,
      promptCategory: validated.promptCategory,
    }
  );

  aiMetrics.compositionsLogged.inc({
    success: String(validated.success),
    tool_count: String(validated.toolSequence.length),
  });

  return {
    eventId: result.eventId,
    signature,
    patternFrequency: result.patternFrequency,
  };
}

export async function getEmergingPatterns(
  options: GetEmergingPatternsOptions = {}
) {
  return await dbGetEmergingPatterns(db, options);
}

export interface CompositionTracker {
  startTracking(sessionId: string, teamId: string, userId: string): void;
  recordToolCall(toolName: string): void;
  finalize(
    success: boolean,
    promptCategory?: string
  ): Promise<CompositionLogResult | null>;
  reset(): void;
}

export function createCompositionTracker(): CompositionTracker {
  let sessionId: string | null = null;
  let teamId: string | null = null;
  let userId: string | null = null;
  let toolSequence: string[] = [];
  let startTime: number | null = null;

  return {
    startTracking(sid: string, tid: string, uid: string) {
      sessionId = sid;
      teamId = tid;
      userId = uid;
      toolSequence = [];
      startTime = Date.now();
    },

    recordToolCall(toolName: string) {
      if (sessionId) {
        toolSequence.push(toolName);
      }
    },

    async finalize(success: boolean, promptCategory?: string) {
      if (!(sessionId && teamId && userId) || toolSequence.length === 0) {
        return null;
      }

      const latencyMs = startTime ? Date.now() - startTime : 0;

      const result = await logComposition({
        sessionId,
        teamId,
        userId,
        toolSequence,
        success,
        latencyMs,
        timestamp: Date.now(),
        promptCategory,
        entityTypes: [],
      });

      this.reset();
      return result;
    },

    reset() {
      sessionId = null;
      teamId = null;
      userId = null;
      toolSequence = [];
      startTime = null;
    },
  };
}

export function normalizeToolSequence(sequence: string[]): string[] {
  return sequence.map((t) => t.trim().toLowerCase());
}

export function compareSignatures(seq1: string[], seq2: string[]): boolean {
  return generateSignature(seq1) === generateSignature(seq2);
}
