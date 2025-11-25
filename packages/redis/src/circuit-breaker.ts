/**
 * Circuit Breaker Pattern
 *
 * Prevents cascading failures by temporarily disabling calls to failing services.
 * Supports half-open state for gradual recovery.
 */
import { getRedisClient } from "./client";

// === Types ===

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery */
  recoveryTimeout: number;
  /** Number of successes in half-open needed to close */
  successThreshold: number;
  /** Time window in ms for counting failures */
  failureWindow: number;
  /** Optional: Custom fallback function */
  fallback?: <T>() => T | Promise<T>;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: number;
  lastSuccess?: number;
  openedAt?: number;
  totalRequests: number;
  failedRequests: number;
  successRate: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30_000, // 30 seconds
  successThreshold: 3,
  failureWindow: 60_000, // 1 minute
};

// === Circuit Breaker ===

export class CircuitBreaker {
  private readonly name: string;
  private readonly config: CircuitBreakerConfig;
  private readonly PREFIX = "circuit:";

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the Redis key for this circuit
   */
  private getKey(): string {
    return `${this.PREFIX}${this.name}`;
  }

  /**
   * Get current circuit state
   */
  async getState(): Promise<CircuitState> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      const data = await client.hGetAll(key);

      if (!data.state) {
        return "closed";
      }

      // Check if open circuit should transition to half-open
      if (data.state === "open" && data.openedAt) {
        const openedAt = Number.parseInt(data.openedAt, 10);
        if (Date.now() - openedAt >= this.config.recoveryTimeout) {
          await this.setState("half-open");
          return "half-open";
        }
      }

      return data.state as CircuitState;
    } catch (error) {
      console.error("Circuit breaker get state error:", error);
      return "closed"; // Fail open
    }
  }

  /**
   * Set circuit state
   */
  private async setState(state: CircuitState): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      const updates: Record<string, string> = { state };

      if (state === "open") {
        updates.openedAt = Date.now().toString();
        updates.halfOpenSuccesses = "0";
      } else if (state === "closed") {
        updates.failures = "0";
        updates.openedAt = "";
        updates.halfOpenSuccesses = "0";
      }

      await client.hSet(key, updates);
    } catch (error) {
      console.error("Circuit breaker set state error:", error);
    }
  }

  /**
   * Record a failure
   */
  async recordFailure(error?: Error): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      const multi = client.multi();

      // Increment failure count
      multi.hIncrBy(key, "failures", 1);
      multi.hIncrBy(key, "totalRequests", 1);
      multi.hIncrBy(key, "failedRequests", 1);
      multi.hSet(key, "lastFailure", Date.now().toString());

      if (error) {
        multi.hSet(key, "lastError", error.message);
      }

      const results = await multi.exec();
      const failures =
        typeof results[0] === "number" ? results[0] : Number(results[0]);

      // Check if we should open the circuit
      if (failures >= this.config.failureThreshold) {
        const currentState = await this.getState();
        if (currentState === "closed" || currentState === "half-open") {
          await this.setState("open");
          console.warn(
            `Circuit ${this.name} opened after ${failures} failures`
          );
        }
      }
    } catch (err) {
      console.error("Circuit breaker record failure error:", err);
    }
  }

  /**
   * Record a success
   */
  async recordSuccess(): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      const currentState = await this.getState();

      const multi = client.multi();
      multi.hIncrBy(key, "totalRequests", 1);
      multi.hSet(key, "lastSuccess", Date.now().toString());

      if (currentState === "half-open") {
        multi.hIncrBy(key, "halfOpenSuccesses", 1);
      }

      const results = await multi.exec();

      // Check if we should close the circuit
      if (currentState === "half-open") {
        const halfOpenSuccesses = await client.hGet(key, "halfOpenSuccesses");
        if (
          halfOpenSuccesses &&
          Number.parseInt(halfOpenSuccesses, 10) >= this.config.successThreshold
        ) {
          await this.setState("closed");
          console.info(`Circuit ${this.name} closed after recovery`);
        }
      }
    } catch (error) {
      console.error("Circuit breaker record success error:", error);
    }
  }

  /**
   * Check if circuit allows requests
   */
  async isAllowed(): Promise<boolean> {
    const state = await this.getState();
    return state !== "open";
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.getState();

    // If circuit is open, fail fast or use fallback
    if (state === "open") {
      if (this.config.fallback) {
        return await this.config.fallback<T>();
      }
      throw new CircuitOpenError(`Circuit ${this.name} is open`);
    }

    try {
      const result = await fn();
      await this.recordSuccess();
      return result;
    } catch (error) {
      await this.recordFailure(error as Error);
      throw error;
    }
  }

  /**
   * Get circuit statistics
   */
  async getStats(): Promise<CircuitStats> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      const data = await client.hGetAll(key);

      const totalRequests = Number.parseInt(data.totalRequests || "0", 10);
      const failedRequests = Number.parseInt(data.failedRequests || "0", 10);

      return {
        state: (data.state as CircuitState) || "closed",
        failures: Number.parseInt(data.failures || "0", 10),
        successes: Number.parseInt(data.halfOpenSuccesses || "0", 10),
        lastFailure: data.lastFailure
          ? Number.parseInt(data.lastFailure, 10)
          : undefined,
        lastSuccess: data.lastSuccess
          ? Number.parseInt(data.lastSuccess, 10)
          : undefined,
        openedAt: data.openedAt
          ? Number.parseInt(data.openedAt, 10)
          : undefined,
        totalRequests,
        failedRequests,
        successRate:
          totalRequests > 0
            ? ((totalRequests - failedRequests) / totalRequests) * 100
            : 100,
      };
    } catch (error) {
      console.error("Circuit breaker get stats error:", error);
      return {
        state: "closed",
        failures: 0,
        successes: 0,
        totalRequests: 0,
        failedRequests: 0,
        successRate: 100,
      };
    }
  }

  /**
   * Reset the circuit breaker
   */
  async reset(): Promise<void> {
    const client = await getRedisClient();
    const key = this.getKey();

    try {
      await client.del(key);
      console.info(`Circuit ${this.name} reset`);
    } catch (error) {
      console.error("Circuit breaker reset error:", error);
    }
  }

  /**
   * Force open the circuit (for maintenance)
   */
  async forceOpen(): Promise<void> {
    await this.setState("open");
    console.warn(`Circuit ${this.name} force opened`);
  }

  /**
   * Force close the circuit
   */
  async forceClose(): Promise<void> {
    await this.setState("closed");
    console.info(`Circuit ${this.name} force closed`);
  }
}

// === Custom Error ===

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}

// === Circuit Breaker Registry ===

class CircuitBreakerRegistry {
  private circuits: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuits.has(name)) {
      this.circuits.set(name, new CircuitBreaker(name, config));
    }
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit stats
   */
  async getAllStats(): Promise<Map<string, CircuitStats>> {
    const stats = new Map<string, CircuitStats>();

    for (const [name, circuit] of this.circuits) {
      stats.set(name, await circuit.getStats());
    }

    return stats;
  }

  /**
   * Reset all circuits
   */
  async resetAll(): Promise<void> {
    for (const circuit of this.circuits.values()) {
      await circuit.reset();
    }
  }
}

// Export singleton registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// === Pre-configured Circuit Breakers ===

/**
 * Circuit breaker for Vespa operations
 */
export const vespaCircuit = circuitBreakerRegistry.get("vespa", {
  failureThreshold: 5,
  recoveryTimeout: 30_000,
  successThreshold: 2,
});

/**
 * Circuit breaker for external API calls (per connector type)
 */
export function getConnectorCircuit(connectorType: string): CircuitBreaker {
  return circuitBreakerRegistry.get(`connector:${connectorType}`, {
    failureThreshold: 10,
    recoveryTimeout: 60_000,
    successThreshold: 3,
  });
}

/**
 * Circuit breaker for LLM API calls
 */
export const llmCircuit = circuitBreakerRegistry.get("llm", {
  failureThreshold: 3,
  recoveryTimeout: 60_000,
  successThreshold: 2,
});

/**
 * Circuit breaker for embedding API calls
 */
export const embeddingCircuit = circuitBreakerRegistry.get("embedding", {
  failureThreshold: 5,
  recoveryTimeout: 30_000,
  successThreshold: 2,
});
