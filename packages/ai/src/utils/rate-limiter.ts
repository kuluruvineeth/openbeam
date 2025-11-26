/**
 * Rate Limiter
 *
 * Simple token bucket rate limiter for AI API calls.
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute: number;
  maxBurst?: number;
}

/**
 * Rate limiter state
 */
interface RateLimiterState {
  requestTokens: number;
  tokenTokens: number;
  lastRefill: number;
}

/**
 * Rate Limiter class
 */
export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimiterState;

  constructor(config: RateLimitConfig) {
    this.config = {
      ...config,
      maxBurst: config.maxBurst || Math.ceil(config.requestsPerMinute / 6), // 10 second burst
    };

    this.state = {
      requestTokens: this.config.maxBurst!,
      tokenTokens: config.tokensPerMinute,
      lastRefill: Date.now(),
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.state.lastRefill) / 1000 / 60; // minutes

    // Refill request tokens
    const requestRefill = elapsed * this.config.requestsPerMinute;
    this.state.requestTokens = Math.min(
      this.config.maxBurst!,
      this.state.requestTokens + requestRefill
    );

    // Refill token tokens
    const tokenRefill = elapsed * this.config.tokensPerMinute;
    this.state.tokenTokens = Math.min(
      this.config.tokensPerMinute,
      this.state.tokenTokens + tokenRefill
    );

    this.state.lastRefill = now;
  }

  /**
   * Check if a request can proceed
   */
  canProceed(estimatedTokens = 0): boolean {
    this.refill();
    return (
      this.state.requestTokens >= 1 && this.state.tokenTokens >= estimatedTokens
    );
  }

  /**
   * Consume tokens for a request
   */
  consume(tokens = 0): boolean {
    this.refill();

    if (!this.canProceed(tokens)) {
      return false;
    }

    this.state.requestTokens -= 1;
    this.state.tokenTokens -= tokens;

    return true;
  }

  /**
   * Wait until request can proceed
   */
  async waitForCapacity(estimatedTokens = 0): Promise<void> {
    while (!this.canProceed(estimatedTokens)) {
      // Calculate wait time
      const requestWait =
        this.state.requestTokens < 1
          ? ((1 - this.state.requestTokens) / this.config.requestsPerMinute) *
            60 *
            1000
          : 0;

      const tokenWait =
        this.state.tokenTokens < estimatedTokens
          ? ((estimatedTokens - this.state.tokenTokens) /
              this.config.tokensPerMinute) *
            60 *
            1000
          : 0;

      const waitMs = Math.max(requestWait, tokenWait, 100);

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(waitMs, 5000))
      );
    }
  }

  /**
   * Get current state
   */
  getState(): {
    requestTokens: number;
    tokenTokens: number;
    requestsPerMinute: number;
    tokensPerMinute: number;
  } {
    this.refill();
    return {
      requestTokens: Math.floor(this.state.requestTokens),
      tokenTokens: Math.floor(this.state.tokenTokens),
      requestsPerMinute: this.config.requestsPerMinute,
      tokensPerMinute: this.config.tokensPerMinute,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.state = {
      requestTokens: this.config.maxBurst!,
      tokenTokens: this.config.tokensPerMinute,
      lastRefill: Date.now(),
    };
  }
}

/**
 * Create a rate limiter with default OpenAI limits
 */
export function createOpenAIRateLimiter(): RateLimiter {
  return new RateLimiter({
    requestsPerMinute: 500, // Tier 1 default
    tokensPerMinute: 30_000, // Tier 1 default
  });
}

/**
 * Create a rate limiter with default Anthropic limits
 */
export function createAnthropicRateLimiter(): RateLimiter {
  return new RateLimiter({
    requestsPerMinute: 60,
    tokensPerMinute: 40_000,
  });
}

/**
 * Global rate limiters per provider
 */
const rateLimiters: Map<string, RateLimiter> = new Map();

/**
 * Get or create a rate limiter for a provider
 */
export function getRateLimiter(provider: string): RateLimiter {
  let limiter = rateLimiters.get(provider);

  if (!limiter) {
    // Default limits
    limiter = new RateLimiter({
      requestsPerMinute: 100,
      tokensPerMinute: 100_000,
    });
    rateLimiters.set(provider, limiter);
  }

  return limiter;
}

/**
 * Set rate limiter for a provider
 */
export function setRateLimiter(
  provider: string,
  config: RateLimitConfig
): void {
  rateLimiters.set(provider, new RateLimiter(config));
}

export default RateLimiter;
