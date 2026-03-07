import { type RateLimitConfig, rateLimiter } from "@openbeam/redis";
import type {
  RateLimitState,
  SlackClientConfig,
} from "@openbeam/types/services/connectors/slack";
import { LogLevel, WebClient, type WebClientOptions } from "@slack/web-api";
import { logger } from "../lib/logger";
import { SlackApiError, SlackErrorCodes } from "./types";

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 30_000;

const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  requestsPerMinute: 50,
  requestsPerHour: 2000,
  burstLimit: 20,
};

export interface SlackClient {
  readonly webClient: WebClient;
  readonly connectorId: string;
  readonly teamId?: string;
  call<T>(method: string, args?: Record<string, unknown>): Promise<T>;
  getRateLimitState(): Promise<RateLimitState>;
  healthCheck(): Promise<boolean>;
}

interface ClientState {
  lastRateLimitHit?: number;
  consecutiveErrors: number;
  lastError?: Error;
}

export function createSlackClient(config: SlackClientConfig): SlackClient {
  const {
    token,
    connectorId,
    teamId,
    rateLimitConfig = DEFAULT_RATE_LIMITS,
    timeout = DEFAULT_TIMEOUT,
    debug = false,
  } = config;

  const webClientOptions: WebClientOptions = {
    timeout,
    retryConfig: {
      retries: 0,
    },
    logLevel: debug ? LogLevel.DEBUG : LogLevel.ERROR,
  };

  const webClient = new WebClient(token, webClientOptions);

  const state: ClientState = {
    consecutiveErrors: 0,
  };

  async function checkRateLimit(method: string): Promise<void> {
    const { allowed, reason } = await rateLimiter.checkConnectorRateLimit(
      connectorId,
      "slack",
      rateLimitConfig
    );

    if (!allowed) {
      if (debug) {
        logger.debug({ method, reason }, "Slack rate limit hit");
      }

      state.lastRateLimitHit = Date.now();

      const quotaAvailable = await rateLimiter.waitForQuota(
        connectorId,
        "slack",
        rateLimitConfig,
        5
      );

      if (!quotaAvailable) {
        throw new SlackApiError(
          `Rate limit exceeded for ${method}`,
          SlackErrorCodes.RATE_LIMITED,
          true,
          60
        );
      }
    }
  }

  function calculateRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter) {
      return retryAfter * 1000;
    }

    const exponentialDelay = BASE_RETRY_DELAY * 2 ** attempt;
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  async function executeWithRetry<T>(
    method: string,
    args: Record<string, unknown>,
    attempt = 0
  ): Promise<T> {
    try {
      await checkRateLimit(method);
      const methodParts = method.split(".");

      if (methodParts.length === 0) {
        throw new Error(`Invalid Slack API method: ${method}`);
      }

      let target: unknown = webClient;

      for (const part of methodParts.slice(0, -1)) {
        if (
          !target ||
          typeof target !== "object" ||
          !Object.hasOwn(target, part)
        ) {
          throw new Error(
            `Invalid Slack API method: ${method} (${part} not found)`
          );
        }
        target = (target as Record<string, unknown>)[part];
      }

      const finalMethod = methodParts.at(-1);
      if (
        !(finalMethod && target) ||
        typeof target !== "object" ||
        !Object.hasOwn(target, finalMethod) ||
        typeof (target as Record<string, unknown>)[finalMethod] !== "function"
      ) {
        throw new Error(
          `Invalid Slack API method: ${method} (${finalMethod} is not a function)`
        );
      }

      const fn = (target as Record<string, unknown>)[finalMethod] as (
        params: Record<string, unknown>
      ) => Promise<unknown>;
      const result = await fn(args);
      state.consecutiveErrors = 0;
      return result as T;
    } catch (error) {
      return handleRetryableError<T>(error, method, args, attempt);
    }
  }

  function handleRetryableError<T>(
    error: unknown,
    method: string,
    args: Record<string, unknown>,
    attempt: number
  ): Promise<T> {
    state.consecutiveErrors += 1;
    state.lastError = error instanceof Error ? error : new Error(String(error));

    const slackError = extractSlackError(error);
    const canRetry = attempt < DEFAULT_RETRY_ATTEMPTS;

    if (slackError?.retryable && canRetry) {
      return retryWithDelay<T>(method, args, attempt, slackError.retryAfter);
    }

    if (slackError) {
      if (SlackApiError.isScopeError(slackError.code)) {
        const scopeHelp = SlackApiError.getScopeErrorHelp(method);
        logger.error(
          {
            connectorId,
            method,
            errorCode: slackError.code,
            help: scopeHelp,
          },
          `Slack scope error: ${scopeHelp}`
        );
      }
      throw slackError;
    }

    if (canRetry) {
      return retryWithDelay<T>(method, args, attempt);
    }

    throw new Error(
      `Slack ${method} failed for connector ${connectorId} after ${DEFAULT_RETRY_ATTEMPTS} attempts`,
      { cause: error }
    );
  }

  async function retryWithDelay<T>(
    method: string,
    args: Record<string, unknown>,
    attempt: number,
    retryAfter?: number
  ): Promise<T> {
    const delay = calculateRetryDelay(attempt, retryAfter);
    if (debug) {
      logger.debug(
        { method, delay, attempt: attempt + 1 },
        "Slack retrying request"
      );
    }
    await sleep(delay);
    return executeWithRetry<T>(method, args, attempt + 1);
  }

  async function getRateLimitState(): Promise<RateLimitState> {
    const quota = await rateLimiter.getRemainingQuota(
      connectorId,
      "slack",
      rateLimitConfig
    );

    return {
      remaining: quota.minuteRemaining ?? 0,
      resetAt: Date.now() + 60_000,
      retryAfter: state.lastRateLimitHit
        ? Math.max(0, 60_000 - (Date.now() - state.lastRateLimitHit))
        : undefined,
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const result = await webClient.auth.test();
      return result.ok === true;
    } catch (error) {
      logger.debug({ error, connectorId }, "Slack health check failed");
      return false;
    }
  }

  return {
    webClient,
    connectorId,
    teamId,
    call: <T>(method: string, args: Record<string, unknown> = {}) =>
      executeWithRetry<T>(method, args),
    getRateLimitState,
    healthCheck,
  };
}

function extractSlackError(error: unknown): SlackApiError | null {
  if (error instanceof SlackApiError) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    const data = error.data as Record<string, unknown>;

    if (typeof data.error === "string") {
      const retryAfter =
        "headers" in error &&
        error.headers &&
        typeof error.headers === "object" &&
        "retry-after" in error.headers
          ? Number(error.headers["retry-after"])
          : undefined;

      return SlackApiError.fromResponse(data.error, retryAfter);
    }
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string"
  ) {
    return SlackApiError.fromResponse(
      (error as Record<string, unknown>).code as string
    );
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { DEFAULT_RATE_LIMITS, DEFAULT_TIMEOUT };
