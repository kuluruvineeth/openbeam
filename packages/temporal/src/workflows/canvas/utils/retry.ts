import type { RetryNodeConfig } from "@openplane/types/canvas";

const HASH_MODULO = 2_147_483_647;
const HASH_MULTIPLIER = 31;
const EXPONENTIAL_BASE = 2;

export function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash = (hash * HASH_MULTIPLIER + code) % HASH_MODULO;
  }
  return hash;
}

export function resolveJitterMs(seed: string, jitterMs: number): number {
  if (jitterMs <= 0) {
    return 0;
  }
  return hashSeed(seed) % (jitterMs + 1);
}

export function resolveRetryDelayMs(params: {
  attempt: number;
  config: RetryNodeConfig;
  seed: string;
}): number {
  const multiplier = params.config.exponential
    ? EXPONENTIAL_BASE ** (params.attempt - 1)
    : 1;
  const base = params.config.backoffMs * multiplier;
  const jitter =
    params.config.jitterMs !== undefined
      ? resolveJitterMs(params.seed, params.config.jitterMs)
      : 0;
  return base + jitter;
}

export function shouldRetry(params: {
  attempt: number;
  maxAttempts: number;
}): boolean {
  return params.attempt < params.maxAttempts;
}
