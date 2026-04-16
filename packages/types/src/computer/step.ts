import { z } from "zod";

export const ComputerStepTypeSchema = z.enum([
  "TOOL_CALL",
  "AI_GENERATION",
  "MEMORY_READ",
  "MEMORY_WRITE",
  "NOTIFICATION",
  "PROPOSAL",
  "CONNECTOR_CALL",
  "CONTEXT",
]);
export type ComputerStepType = z.infer<typeof ComputerStepTypeSchema>;

export const StepRecordSchema = z.object({
  type: z.string(),
  name: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  durationMs: z.number().int(),
});
export type StepRecord = z.infer<typeof StepRecordSchema>;
