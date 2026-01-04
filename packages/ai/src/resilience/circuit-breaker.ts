import { classifyError } from "./errors";
import type {
  CircuitBreakerConfig,
  CircuitBreakerState,
  CircuitState,
  ClassifiedError,
} from "./types";
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from "./types";

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: ClassifiedError;
  circuitState: CircuitState;
  usedFallback: boolean;
}

export type CircuitBreakerListener = (
  event: "stateChange" | "failure" | "success",
  state: CircuitBreakerState
) => void;

export class CircuitBreaker {
  private readonly name: string;
  private state: CircuitBreakerState;
  private readonly config: CircuitBreakerConfig;
  private readonly failureTimestamps: number[] = [];
  private halfOpenAttempts = 0;
  private readonly listeners: Set<CircuitBreakerListener> = new Set();

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.state = { state: "closed", failures: 0, successes: 0 };
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    const currentState = this.getCurrentState();

    const blockedResult = await this.handleBlockedState(currentState, fallback);
    if (blockedResult) {
      return blockedResult;
    }

    if (currentState === "half-open") {
      this.halfOpenAttempts += 1;
    }

    return this.executeOperation(operation, fallback);
  }

  private handleBlockedState<T>(
    currentState: CircuitState,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T> | null> | null {
    if (currentState === "open") {
      return this.handleOpenState(fallback);
    }

    if (
      currentState === "half-open" &&
      this.halfOpenAttempts >= this.config.halfOpenRequests
    ) {
      return this.handleHalfOpenExhausted(fallback);
    }

    return null;
  }

  private handleOpenState<T>(
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    if (fallback) {
      return this.tryFallback(fallback, "open");
    }

    return Promise.resolve({
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: `Circuit breaker '${this.name}' is open`,
        retryable: false,
        originalError: new Error("Circuit breaker open"),
      },
      circuitState: "open" as const,
      usedFallback: false,
    });
  }

  private handleHalfOpenExhausted<T>(
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    if (fallback) {
      return this.tryFallback(fallback, "half-open");
    }

    return Promise.resolve({
      success: false,
      error: {
        code: "PROVIDER_ERROR",
        message: `Circuit breaker '${this.name}' is half-open, max probes reached`,
        retryable: false,
        originalError: new Error(
          "Circuit breaker half-open, max probes reached"
        ),
      },
      circuitState: "half-open" as const,
      usedFallback: false,
    });
  }

  private async tryFallback<T>(
    fallback: () => Promise<T>,
    circuitState: CircuitState
  ): Promise<CircuitBreakerResult<T>> {
    try {
      const data = await fallback();
      return { success: true, data, circuitState, usedFallback: true };
    } catch (err) {
      return {
        success: false,
        error: classifyError(err),
        circuitState,
        usedFallback: true,
      };
    }
  }

  private async executeOperation<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<CircuitBreakerResult<T>> {
    try {
      const data = await operation();
      this.recordSuccess();
      return {
        success: true,
        data,
        circuitState: this.state.state,
        usedFallback: false,
      };
    } catch (err) {
      const classified = classifyError(err);
      this.recordFailure(classified);

      if (this.state.state === "open" && fallback) {
        return this.tryFallback(fallback, "open");
      }

      return {
        success: false,
        error: classified,
        circuitState: this.state.state,
        usedFallback: false,
      };
    }
  }

  private getCurrentState(): CircuitState {
    if (this.state.state === "open") {
      const now = Date.now();
      if (this.state.nextAttemptAt && now >= this.state.nextAttemptAt) {
        this.transitionTo("half-open");
        this.halfOpenAttempts = 0;
        return "half-open";
      }
      return "open";
    }

    return this.state.state;
  }

  private recordSuccess(): void {
    this.state.successes += 1;
    this.emit("success", this.state);

    if (this.state.state === "half-open") {
      this.transitionTo("closed");
      this.failureTimestamps.length = 0;
      this.state.failures = 0;
    }
  }

  private recordFailure(_error: ClassifiedError): void {
    const now = Date.now();
    this.state.failures += 1;
    this.state.lastFailureAt = now;
    this.failureTimestamps.push(now);
    this.emit("failure", this.state);

    this.pruneOldFailures(now);

    if (this.state.state === "half-open") {
      this.openCircuit(now);
      return;
    }

    if (this.failureTimestamps.length >= this.config.failureThreshold) {
      this.openCircuit(now);
    }
  }

  private openCircuit(now: number): void {
    this.transitionTo("open");
    this.state.openedAt = now;
    this.state.nextAttemptAt = now + this.config.resetTimeoutMs;
  }

  private pruneOldFailures(now: number): void {
    const windowStart = now - this.config.windowMs;
    let oldest = this.failureTimestamps[0];
    while (oldest !== undefined && oldest < windowStart) {
      this.failureTimestamps.shift();
      oldest = this.failureTimestamps[0];
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state.state !== newState) {
      this.state.state = newState;
      this.emit("stateChange", this.state);
    }
  }

  getState(): Readonly<CircuitBreakerState> {
    return { ...this.state };
  }

  reset(): void {
    this.state = { state: "closed", failures: 0, successes: 0 };
    this.failureTimestamps.length = 0;
    this.halfOpenAttempts = 0;
  }

  forceOpen(): void {
    this.openCircuit(Date.now());
  }

  forceClose(): void {
    this.reset();
  }

  onStateChange(listener: CircuitBreakerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(
    event: "stateChange" | "failure" | "success",
    state: CircuitBreakerState
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event, { ...state });
      } catch {
        // Ignore listener errors
      }
    }
  }
}

export class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  get(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(name, { ...this.defaultConfig, ...config });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  getOrCreate(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    return this.get(name, config);
  }

  has(name: string): boolean {
    return this.breakers.has(name);
  }

  remove(name: string): boolean {
    return this.breakers.delete(name);
  }

  reset(name?: string): void {
    if (name) {
      this.breakers.get(name)?.reset();
    } else {
      for (const breaker of this.breakers.values()) {
        breaker.reset();
      }
    }
  }

  getAll(): Map<string, CircuitBreakerState> {
    const states = new Map<string, CircuitBreakerState>();
    for (const [name, breaker] of this.breakers) {
      states.set(name, breaker.getState());
    }
    return states;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
