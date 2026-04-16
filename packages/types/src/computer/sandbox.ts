import { z } from "zod";

export const SandboxLimitsSchema = z.object({
  maxToolCalls: z.number().int().default(50),
  maxLlmCalls: z.number().int().default(10),
  memoryLimitMb: z.number().int().default(64),
  cpuTimeLimitMs: z.number().int().default(30_000),
});
export type SandboxLimits = z.infer<typeof SandboxLimitsSchema>;

export const DEFAULT_SANDBOX_LIMITS: SandboxLimits = {
  maxToolCalls: 50,
  maxLlmCalls: 10,
  memoryLimitMb: 64,
  cpuTimeLimitMs: 30_000,
};

export interface ExecuteAgentOptions {
  db: unknown;
  teamId: string;
  userId: string;
  agentId: string;
  agentName: string;
  agentSlug: string;
  runId: string;
  code: string;
  timezone?: string | null;
  triggerContext?: Record<string, unknown>;
}

export interface ExecuteAgentResult {
  success: boolean;
  proposalSubmitted: boolean;
  result?: unknown;
  error?: string;
  steps: Array<{
    type: string;
    name: string;
    input: unknown;
    output: unknown;
    durationMs: number;
  }>;
  toolCallCount: number;
  llmCallCount: number;
}
