import os from "node:os";
import type { QueryExecutionOptions } from "./types";

export interface DuckDBResourceConfig {
  maxMemoryMb: number;
  threads: number;
  tempDirectory: string;
  accessMode: "READ_WRITE" | "READ_ONLY";
}

export interface FileLimits {
  maxFileSizeBytes: number;
  maxRowCount: number;
  maxColumnCount: number;
}

export interface CircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

export interface CacheConfig {
  defaultTtlSeconds: number;
  maxTtlSeconds: number;
  keyPrefix: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterFactor: number;
}

export const DEFAULT_DUCKDB_CONFIG: DuckDBResourceConfig = {
  maxMemoryMb: 512,
  threads: 2,
  tempDirectory: process.env.DUCKDB_TEMP_DIR ?? "/tmp/duckdb",
  accessMode: "READ_ONLY",
};

export const PRODUCTION_FILE_LIMITS: FileLimits = {
  maxFileSizeBytes: 100 * 1024 * 1024,
  maxRowCount: 1_000_000,
  maxColumnCount: 500,
};

export const DEFAULT_QUERY_OPTIONS: QueryExecutionOptions = {
  timeoutMs: 30_000,
  maxResultRows: 10_000,
};

export const CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  timeout: 30_000,
  errorThresholdPercentage: 50,
  resetTimeout: 60_000,
  volumeThreshold: 5,
};

export const CACHE_CONFIG: CacheConfig = {
  defaultTtlSeconds: 300,
  maxTtlSeconds: 3600,
  keyPrefix: "duckdb:query:",
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 10_000,
  backoffFactor: 2,
  jitterFactor: 0.2,
};

export function calculateOptimalConfig(
  systemMemoryMb?: number,
  availableCores?: number
): DuckDBResourceConfig {
  const totalMemory = systemMemoryMb ?? Math.floor(os.totalmem() / 1024 / 1024);
  const cpuCount = availableCores ?? os.cpus().length;

  const memoryPerThread = 256;
  const maxThreads = Math.min(cpuCount, 4);
  const safeMemory = Math.min(totalMemory * 0.5, maxThreads * memoryPerThread);

  return {
    maxMemoryMb: Math.floor(safeMemory),
    threads: maxThreads,
    tempDirectory: process.env.DUCKDB_TEMP_DIR ?? "/tmp/duckdb",
    accessMode: "READ_ONLY",
  };
}

export function getConfigFromEnv(): Partial<DuckDBResourceConfig> {
  const config: Partial<DuckDBResourceConfig> = {};

  if (process.env.DUCKDB_MAX_MEMORY_MB) {
    config.maxMemoryMb = Number.parseInt(process.env.DUCKDB_MAX_MEMORY_MB, 10);
  }

  if (process.env.DUCKDB_THREADS) {
    config.threads = Number.parseInt(process.env.DUCKDB_THREADS, 10);
  }

  if (process.env.DUCKDB_TEMP_DIR) {
    config.tempDirectory = process.env.DUCKDB_TEMP_DIR;
  }

  return config;
}

export function mergeConfig(
  base: DuckDBResourceConfig,
  overrides: Partial<DuckDBResourceConfig>
): DuckDBResourceConfig {
  return {
    ...base,
    ...overrides,
  };
}
