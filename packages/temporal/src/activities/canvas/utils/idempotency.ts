import { createHash } from "node:crypto";
import { getRedisClient } from "@openbeam/redis";

const IDEMPOTENCY_KEY_PREFIX = "activity:idempotency";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyOptions<TInput> {
  keyGenerator: (input: TInput) => string;
  ttlMs?: number;
}

function hashInput(input: unknown): string {
  const serialized = JSON.stringify(input, Object.keys(input as object).sort());
  return createHash("sha256").update(serialized).digest("hex").slice(0, 32);
}

export function generateIdempotencyKey(
  activityName: string,
  input: unknown
): string {
  const inputHash = hashInput(input);
  return `${IDEMPOTENCY_KEY_PREFIX}:${activityName}:${inputHash}`;
}

export function withIdempotency<TInput, TOutput>(
  activity: (input: TInput) => Promise<TOutput>,
  options: IdempotencyOptions<TInput>
): (input: TInput) => Promise<TOutput> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  return async (input: TInput): Promise<TOutput> => {
    const key = options.keyGenerator(input);
    const redis = await getRedisClient();

    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as TOutput;
    }

    const result = await activity(input);

    await redis.set(key, JSON.stringify(result), { PX: ttlMs });

    return result;
  };
}

export function createExecutionStepIdempotencyKey(input: {
  executionId: string;
  node: { id: string };
}): string {
  return generateIdempotencyKey("createCanvasExecutionStep", {
    executionId: input.executionId,
    nodeId: input.node.id,
  });
}

export function createUpdateExecutionIdempotencyKey(input: {
  executionId: string;
  status?: string;
}): string {
  return generateIdempotencyKey("updateCanvasExecution", {
    executionId: input.executionId,
    status: input.status,
  });
}

export function createStoreParallelMapOutputIdempotencyKey(input: {
  executionId: string;
  nodeId: string;
  output?: unknown;
}): string {
  return generateIdempotencyKey("storeParallelMapOutput", {
    executionId: input.executionId,
    nodeId: input.nodeId,
    outputHash: hashInput(input.output ?? null),
  });
}
