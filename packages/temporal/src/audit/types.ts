import { z } from "zod";

export const WorkflowAuditActionSchema = z.enum([
  "started",
  "completed",
  "failed",
  "paused",
  "resumed",
  "cancelled",
  "signaled",
  "checkpoint",
  "rate_limited",
  "signal_dropped",
]);

export type WorkflowAuditAction = z.infer<typeof WorkflowAuditActionSchema>;

export const AgentAuditActionSchema = z.enum([
  "execution_started",
  "execution_completed",
  "execution_failed",
  "execution_cancelled",
  "node_started",
  "node_completed",
  "node_failed",
  "tool_called",
  "tool_completed",
  "tool_failed",
  "approval_requested",
  "approval_granted",
  "approval_rejected",
  "approval_expired",
  "input_requested",
  "input_received",
  "external_mutation",
  "policy_checked",
  "policy_violated",
  "budget_warning",
  "budget_exceeded",
]);

export type AgentAuditAction = z.infer<typeof AgentAuditActionSchema>;

export const AuditActionSchema = z.union([
  WorkflowAuditActionSchema,
  AgentAuditActionSchema,
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const ActorSchema = z
  .string()
  .refine(
    (v) =>
      v.startsWith("user:") ||
      v.startsWith("agent:") ||
      v.startsWith("system:"),
    { message: "Actor must be prefixed with user:, agent:, or system:" }
  );

export type Actor = z.infer<typeof ActorSchema>;

export const WorkflowAuditEventSchema = z.object({
  timestamp: z.number(),
  workflowId: z.string(),
  runId: z.string().optional(),
  teamId: z.string(),
  userId: z.string().optional(),
  action: WorkflowAuditActionSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type WorkflowAuditEvent = z.infer<typeof WorkflowAuditEventSchema>;

export const AgentAuditEventSchema = z.object({
  timestamp: z.number(),
  workflowId: z.string(),
  runId: z.string().optional(),
  teamId: z.string(),
  userId: z.string().optional(),
  executionId: z.string(),
  stepId: z.string().optional(),
  nodeId: z.string().optional(),
  action: AgentAuditActionSchema,
  actor: ActorSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentAuditEvent = z.infer<typeof AgentAuditEventSchema>;

export const LogAuditEventInputSchema = z.object({
  workflowId: z.string(),
  runId: z.string().optional(),
  teamId: z.string(),
  userId: z.string().optional(),
  action: AuditActionSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type LogAuditEventInput = z.infer<typeof LogAuditEventInputSchema>;

export interface WorkflowAuditLogger {
  log(event: WorkflowAuditEvent): Promise<void>;
  logAgentEvent(event: AgentAuditEvent): Promise<void>;
}
