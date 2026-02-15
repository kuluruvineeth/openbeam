import { z } from "zod";

export const TeamKnowledgeEntrySchema = z.object({
  id: z.string(),
  teamId: z.string(),
  contentHash: z.string(),
  content: z.string(),
  category: z.string(),
  sources: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  accessCount: z.number(),
  createdByMissionId: z.string(),
});

export type TeamKnowledgeEntry = z.infer<typeof TeamKnowledgeEntrySchema>;

export const CrossMissionDelegationRequestSchema = z.object({
  requestId: z.string(),
  sourceMissionId: z.string(),
  sourceTeamId: z.string(),
  taskTitle: z.string(),
  taskDescription: z.string(),
  requiredCapabilities: z.array(z.string()),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  timeoutMs: z.number().positive().default(300_000),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type CrossMissionDelegationRequest = z.infer<
  typeof CrossMissionDelegationRequestSchema
>;

export const CrossMissionDelegationResponseSchema = z.object({
  requestId: z.string(),
  targetMissionId: z.string(),
  status: z.enum(["accepted", "rejected", "completed", "failed", "timed_out"]),
  result: z.unknown().optional(),
  reason: z.string().optional(),
});

export type CrossMissionDelegationResponse = z.infer<
  typeof CrossMissionDelegationResponseSchema
>;

export const SharedAgentLeaseSchema = z.object({
  agentId: z.string(),
  agentName: z.string(),
  leasedToMissionId: z.string(),
  leaseExpiresAt: z.number(),
  taskId: z.string().optional(),
});

export type SharedAgentLease = z.infer<typeof SharedAgentLeaseSchema>;

export const CrossMissionSignalPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delegation_request"),
    delegation: CrossMissionDelegationRequestSchema,
  }),
  z.object({
    type: z.literal("delegation_response"),
    response: CrossMissionDelegationResponseSchema,
  }),
  z.object({
    type: z.literal("knowledge_broadcast"),
    knowledgeId: z.string(),
    category: z.string(),
    summary: z.string(),
    sourceMissionId: z.string(),
  }),
  z.object({
    type: z.literal("agent_lease_granted"),
    lease: SharedAgentLeaseSchema,
  }),
  z.object({
    type: z.literal("agent_lease_revoked"),
    agentId: z.string(),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("agent_lease_denied"),
    requestId: z.string(),
    reason: z.enum(["timeout", "quota_exceeded", "no_match"]),
  }),
]);

export type CrossMissionSignalPayload = z.infer<
  typeof CrossMissionSignalPayloadSchema
>;
