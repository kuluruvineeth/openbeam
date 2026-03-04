import { z } from "zod";
import { GeoLocationSchema } from "./spatial";

export const QueryPrioritySchema = z.enum([
  "NORMAL",
  "HIGH",
  "SAFETY_CRITICAL",
]);

export type QueryPriority = z.infer<typeof QueryPrioritySchema>;

export const SafetyLevelSchema = z.enum([
  "INFORMATIONAL",
  "ADVISORY",
  "MANDATORY",
  "EMERGENCY",
]);

export type SafetyLevel = z.infer<typeof SafetyLevelSchema>;

export const RobotContextSchema = z.object({
  robotId: z.string(),
  robotType: z.string(),
  location: GeoLocationSchema.optional(),
  currentZone: z.string().optional(),
  currentTaskId: z.string().optional(),
  sensorContext: z.record(z.string(), z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
});

export type RobotContext = z.infer<typeof RobotContextSchema>;

export const KnowledgeQuerySchema = z.object({
  query: z.string(),
  context: RobotContextSchema,
  maxResults: z.number().optional(),
  priority: QueryPrioritySchema.optional(),
});

export type KnowledgeQuery = z.infer<typeof KnowledgeQuerySchema>;

export const SafetyQuerySchema = z.object({
  query: z.string(),
  context: RobotContextSchema,
  requiredLevel: SafetyLevelSchema,
});

export type SafetyQuery = z.infer<typeof SafetyQuerySchema>;

export const HazardInfoSchema = z.object({
  type: z.string(),
  description: z.string(),
});

export type HazardInfo = z.infer<typeof HazardInfoSchema>;

export const SafetyConstraintSchema = z.object({
  type: z.string(),
  reason: z.string(),
});

export type SafetyConstraint = z.infer<typeof SafetyConstraintSchema>;

export const SafetyResponseSchema = z.object({
  safeToProceed: z.boolean(),
  hazards: z.array(HazardInfoSchema),
  sopReference: z.string().optional(),
  constraints: z.array(SafetyConstraintSchema),
  latencyMs: z.number(),
});

export type SafetyResponse = z.infer<typeof SafetyResponseSchema>;

export const RobotActionSchema = z.object({
  type: z.enum(["navigate", "inspect", "report", "wait", "stop"]),
  target: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  priority: z.number(),
});

export type RobotAction = z.infer<typeof RobotActionSchema>;

export const KnowledgeResultReferenceSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  relevance: z.number(),
  section: z.string().optional(),
});

export type KnowledgeResultReference = z.infer<
  typeof KnowledgeResultReferenceSchema
>;

export const RobotKnowledgeResultSchema = z.object({
  answer: z.string(),
  confidence: z.number(),
  actionable: z.boolean(),
  actions: z.array(RobotActionSchema),
  references: z.array(KnowledgeResultReferenceSchema),
  safetyNotes: z.array(z.string()),
  expiresAt: z.number().optional(),
});

export type RobotKnowledgeResult = z.infer<typeof RobotKnowledgeResultSchema>;

export const RobotTaskAssignmentSchema = z.object({
  robotId: z.string(),
  taskDescription: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]),
  knowledgeContext: z.string().optional(),
});

export type RobotTaskAssignment = z.infer<typeof RobotTaskAssignmentSchema>;

export const RobotEventSchema = z.object({
  robotId: z.string(),
  eventType: z.string(),
  timestamp: z.number(),
  payload: z.record(z.string(), z.unknown()),
  zone: z.string().optional(),
  taskId: z.string().optional(),
});

export type RobotEvent = z.infer<typeof RobotEventSchema>;
