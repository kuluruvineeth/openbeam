import { CIRCUIT_BREAKER_CONFIG, type CircuitBreakerConfig } from "./config";
import { getMetricsCollector, type MetricsCollector } from "./metrics";
import {
  type CircuitBreakerMetrics,
  type CircuitBreakerState,
  DuckDBApiError,
  DuckDBErrorCodes,
} from "./types";

interface CircuitBreakerOptions {
  config?: Partial<CircuitBreakerConfig>;
  metrics?: MetricsCollector;
}

interface CircuitBreakerInstance {
  execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T>;
  getState(): CircuitBreakerState;
  getMetrics(): CircuitBreakerMetrics;
  reset(): void;
}

interface StateData {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  fallbacks: number;
  rejects: number;
  lastFailureTime: number;
  windowStart: number;
  halfOpenAttempts: number;
}

const HALF_OPEN_MAX_ATTEMPTS = 3;

export function createCircuitBreaker(
  options: CircuitBreakerOptions = {}
): CircuitBreakerInstance {
  const config: CircuitBreakerConfig = {
    ...CIRCUIT_BREAKER_CONFIG,
    ...options.config,
  };

  const metricsCollector = options.metrics ?? getMetricsCollector();

  const stateData: StateData = {
    state: "CLOSED",
    failures: 0,
    successes: 0,
    fallbacks: 0,
    rejects: 0,
    lastFailureTime: 0,
    windowStart: Date.now(),
    halfOpenAttempts: 0,
  };

  function resetWindow(): void {
    stateData.failures = 0;
    stateData.successes = 0;
    stateData.windowStart = Date.now();
  }

  function transitionTo(newState: CircuitBreakerState): void {
    if (stateData.state === newState) {
      return;
    }

    stateData.state = newState;
    metricsCollector.setCircuitBreakerState(newState);

    if (newState === "CLOSED") {
      resetWindow();
      stateData.halfOpenAttempts = 0;
    } else if (newState === "HALF_OPEN") {
      stateData.halfOpenAttempts = 0;
    }
  }

  function shouldTrip(): boolean {
    const total = stateData.failures + stateData.successes;
    if (total < config.volumeThreshold) {
      return false;
    }

    const errorRate = (stateData.failures / total) * 100;
    return errorRate >= config.errorThresholdPercentage;
  }

  function canAttempt(): boolean {
    switch (stateData.state) {
      case "CLOSED":
        return true;

      case "OPEN": {
        const timeSinceFailure = Date.now() - stateData.lastFailureTime;
        if (timeSinceFailure >= config.resetTimeout) {
          transitionTo("HALF_OPEN");
          return true;
        }
        return false;
      }

      case "HALF_OPEN":
        return stateData.halfOpenAttempts < HALF_OPEN_MAX_ATTEMPTS;

      default:
        return false;
    }
  }

  function recordSuccess(): void {
    stateData.successes += 1;

    if (stateData.state === "HALF_OPEN") {
      stateData.halfOpenAttempts += 1;
      if (stateData.halfOpenAttempts >= HALF_OPEN_MAX_ATTEMPTS) {
        transitionTo("CLOSED");
      }
    }
  }

  function recordFailure(): void {
    stateData.failures += 1;
    stateData.lastFailureTime = Date.now();

    if (stateData.state === "HALF_OPEN") {
      transitionTo("OPEN");
      return;
    }

    if (stateData.state === "CLOSED" && shouldTrip()) {
      transitionTo("OPEN");
    }
  }

  async function execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (!canAttempt()) {
      stateData.rejects += 1;

      if (fallback) {
        stateData.fallbacks += 1;
        return fallback();
      }

      throw new DuckDBApiError({
        message: "Circuit breaker is open",
        code: DuckDBErrorCodes.CIRCUIT_OPEN,
        retryable: true,
        retryAfter: Math.ceil(
          (config.resetTimeout - (Date.now() - stateData.lastFailureTime)) /
            1000
        ),
      });
    }

    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new DuckDBApiError({
                message: `Operation timed out after ${config.timeout}ms`,
                code: DuckDBErrorCodes.QUERY_TIMEOUT,
                retryable: true,
              })
            );
          }, config.timeout);
        }),
      ]);

      recordSuccess();
      return result;
    } catch (error) {
      recordFailure();

      const elapsed = Date.now() - startTime;
      metricsCollector.recordQuery(
        { teamId: "circuit", operation: "execute", status: "error" },
        elapsed
      );

      if (fallback && stateData.state === "OPEN") {
        stateData.fallbacks += 1;
        return fallback();
      }

      throw error;
    }
  }

  function getState(): CircuitBreakerState {
    if (stateData.state === "OPEN") {
      const timeSinceFailure = Date.now() - stateData.lastFailureTime;
      if (timeSinceFailure >= config.resetTimeout) {
        return "HALF_OPEN";
      }
    }
    return stateData.state;
  }

  function getMetrics(): CircuitBreakerMetrics {
    return {
      state: getState(),
      failures: stateData.failures,
      successes: stateData.successes,
      fallbacks: stateData.fallbacks,
      rejects: stateData.rejects,
    };
  }

  function reset(): void {
    stateData.state = "CLOSED";
    stateData.failures = 0;
    stateData.successes = 0;
    stateData.fallbacks = 0;
    stateData.rejects = 0;
    stateData.lastFailureTime = 0;
    stateData.windowStart = Date.now();
    stateData.halfOpenAttempts = 0;
  }

  return {
    execute,
    getState,
    getMetrics,
    reset,
  };
}

export type CircuitBreaker = ReturnType<typeof createCircuitBreaker>;
