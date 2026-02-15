import { z } from "zod";

export const AgentHeartbeatPhaseSchema = z.enum([
  "initializing",
  "reasoning",
  "tool_calling",
  "synthesizing",
  "checkpointing",
  "finalizing",
]);

export type AgentHeartbeatPhase = z.infer<typeof AgentHeartbeatPhaseSchema>;

export const AgentHeartbeatPayloadSchema = z.object({
  phase: AgentHeartbeatPhaseSchema,
  stepIndex: z.number(),
  chunkIndex: z.number(),
  totalChunksCompleted: z.number(),
  tokensUsed: z.number(),
  costCents: z.number(),
  elapsedMs: z.number(),
  partialOutput: z.string().optional(),
  toolCallsInChunk: z.number().default(0),
  lastToolName: z.string().optional(),
  memoryPressureMb: z.number().optional(),
});

export type AgentHeartbeatPayload = z.infer<typeof AgentHeartbeatPayloadSchema>;

export const ChunkCheckpointSchema = z.object({
  chunkIndex: z.number(),
  partialArtifacts: z.array(z.unknown()),
  intermediateState: z.record(z.string(), z.unknown()),
  tokensUsed: z.number(),
  costCents: z.number(),
  timestamp: z.number(),
});

export type ChunkCheckpoint = z.infer<typeof ChunkCheckpointSchema>;
