import type { RetryPolicy } from "@temporalio/workflow";

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  initialInterval: "1s",
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: "30s",
  nonRetryableErrorTypes: ["AuthorizationError", "ConnectorNotFoundError"],
};

export const SYNC_RETRY_POLICY: RetryPolicy = {
  initialInterval: "2s",
  backoffCoefficient: 2,
  maximumAttempts: 10,
  maximumInterval: "5m",
  nonRetryableErrorTypes: [
    "AuthorizationError",
    "ConnectorNotFoundError",
    "InvalidCredentialsError",
  ],
};

export const ENGINE_RETRY_POLICY: RetryPolicy = {
  initialInterval: "500ms",
  backoffCoefficient: 1.5,
  maximumAttempts: 3,
  maximumInterval: "10s",
  nonRetryableErrorTypes: ["ValidationError", "UnsupportedFileTypeError"],
};

export const MEDIA_RETRY_POLICY: RetryPolicy = {
  initialInterval: "2s",
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: "2m",
  nonRetryableErrorTypes: ["UnsupportedMediaError", "MediaTooLargeError"],
};

export const WEBHOOK_RETRY_POLICY: RetryPolicy = {
  initialInterval: "1s",
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: "30s",
  nonRetryableErrorTypes: [
    "SignatureVerificationError",
    "MalformedPayloadError",
  ],
};

export const STORAGE_RETRY_POLICY: RetryPolicy = {
  initialInterval: "500ms",
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: "30s",
  nonRetryableErrorTypes: ["FileNotFoundError", "PermissionDeniedError"],
};

export const DATABASE_RETRY_POLICY: RetryPolicy = {
  initialInterval: "100ms",
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: "5s",
  nonRetryableErrorTypes: ["ConstraintViolationError", "NotFoundError"],
};

export const CANVAS_NODE_RETRY_POLICY: RetryPolicy = {
  initialInterval: "2s",
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: "30s",
  nonRetryableErrorTypes: [
    "AuthorizationError",
    "CanvasNotFoundError",
    "ValidationError",
  ],
};

export const CANVAS_UPDATE_RETRY_POLICY: RetryPolicy = {
  initialInterval: "500ms",
  backoffCoefficient: 2,
  maximumAttempts: 5,
  maximumInterval: "15s",
  nonRetryableErrorTypes: ["ExecutionNotFoundError", "CanvasNotFoundError"],
};

export const AUDIT_RETRY_POLICY: RetryPolicy = {
  initialInterval: "1s",
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: "10s",
  nonRetryableErrorTypes: [],
};

export const LLM_CALL_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 4,
  initialInterval: "2s",
  backoffCoefficient: 2,
  maximumInterval: "30s",
  nonRetryableErrorTypes: [
    "BUDGET_EXCEEDED",
    "INVALID_PROMPT",
    "CONTENT_FILTERED",
  ],
};

export const AGENT_CHUNKED_RETRY_POLICY: RetryPolicy = {
  initialInterval: "5s",
  backoffCoefficient: 2,
  maximumAttempts: 3,
  maximumInterval: "2m",
  nonRetryableErrorTypes: [
    "BudgetExceededError",
    "AuthorizationError",
    "AgentConfigurationError",
  ],
};

export const EXTERNAL_API_RETRY_POLICY: RetryPolicy = {
  maximumAttempts: 5,
  initialInterval: "1s",
  backoffCoefficient: 3,
  maximumInterval: "60s",
  nonRetryableErrorTypes: [
    "AuthorizationError",
    "ConnectorNotFoundError",
    "InvalidCredentialsError",
    "UNAUTHORIZED",
    "NOT_FOUND",
  ],
};

export function getRetryPolicyForActivity(activityType: string): RetryPolicy {
  const mapping: Record<string, RetryPolicy> = {
    sync: SYNC_RETRY_POLICY,
    fetch: SYNC_RETRY_POLICY,
    parse: ENGINE_RETRY_POLICY,
    chunk: ENGINE_RETRY_POLICY,
    embed: ENGINE_RETRY_POLICY,
    media: MEDIA_RETRY_POLICY,
    transcode: MEDIA_RETRY_POLICY,
    webhook: WEBHOOK_RETRY_POLICY,
    storage: STORAGE_RETRY_POLICY,
    database: DATABASE_RETRY_POLICY,
    llm_call: LLM_CALL_RETRY_POLICY,
    externalApi: EXTERNAL_API_RETRY_POLICY,
    agentChunked: AGENT_CHUNKED_RETRY_POLICY,
    canvas: CANVAS_NODE_RETRY_POLICY,
    canvasUpdate: CANVAS_UPDATE_RETRY_POLICY,
    audit: AUDIT_RETRY_POLICY,
  };

  return mapping[activityType] ?? DEFAULT_RETRY_POLICY;
}
