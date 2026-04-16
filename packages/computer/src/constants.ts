export const AGENT_LIMITS = {
  maxToolCalls: 50,
  maxLlmCalls: 10,
  memoryLimitMb: 64,
  cpuTimeLimitMs: 30_000,
} as const;
