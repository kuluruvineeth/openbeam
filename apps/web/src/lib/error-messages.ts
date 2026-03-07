export type ErrorCategory =
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "NETWORK_ERROR"
  | "DATA_ERROR"
  | "QUOTA_EXCEEDED"
  | "PERMISSION_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "TIMEOUT"
  | "UNKNOWN";

export interface UserFriendlyError {
  title: string;
  message: string;
  action?: string;
  isRetryable: boolean;
}

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: ErrorCategory;
}> = [
  {
    pattern:
      /unauthorized|invalid.*token|expired.*token|authentication.*failed/i,
    category: "AUTH_ERROR",
  },
  { pattern: /rate.*limit|too.*many.*requests|429/i, category: "RATE_LIMIT" },
  {
    pattern: /network.*error|ECONNREFUSED|ETIMEDOUT|socket.*hang/i,
    category: "NETWORK_ERROR",
  },
  {
    pattern: /quota.*exceeded|storage.*full|limit.*reached/i,
    category: "QUOTA_EXCEEDED",
  },
  {
    pattern: /permission.*denied|forbidden|403/i,
    category: "PERMISSION_DENIED",
  },
  {
    pattern: /not.*found|404|does.*not.*exist/i,
    category: "RESOURCE_NOT_FOUND",
  },
  { pattern: /timeout|timed.*out/i, category: "TIMEOUT" },
  {
    pattern: /embedding.*failed|RuntimeError.*buffer/i,
    category: "DATA_ERROR",
  },
  { pattern: /child.*workflow.*failed/i, category: "DATA_ERROR" },
];

const ERROR_MESSAGES: Record<ErrorCategory, UserFriendlyError> = {
  AUTH_ERROR: {
    title: "Authentication failed",
    message: "Your connection has expired or was revoked. Please reconnect.",
    action: "Reconnect",
    isRetryable: false,
  },
  RATE_LIMIT: {
    title: "Rate limit reached",
    message:
      "Too many requests. Sync will resume automatically in a few minutes.",
    action: "Wait",
    isRetryable: true,
  },
  NETWORK_ERROR: {
    title: "Connection issue",
    message: "Unable to reach the data source. Check your internet connection.",
    action: "Retry",
    isRetryable: true,
  },
  DATA_ERROR: {
    title: "Processing error",
    message:
      "Some documents couldn't be processed. This won't affect other data.",
    action: "Retry",
    isRetryable: true,
  },
  QUOTA_EXCEEDED: {
    title: "Storage limit reached",
    message:
      "Your plan's storage limit has been reached. Upgrade to continue syncing.",
    action: "Upgrade",
    isRetryable: false,
  },
  PERMISSION_DENIED: {
    title: "Access denied",
    message: "Missing required permissions. Check your connector settings.",
    action: "Review permissions",
    isRetryable: false,
  },
  RESOURCE_NOT_FOUND: {
    title: "Source not found",
    message: "The workspace or resource no longer exists.",
    action: "Reconnect",
    isRetryable: false,
  },
  TIMEOUT: {
    title: "Request timed out",
    message: "The sync took too long. This is usually temporary.",
    action: "Retry",
    isRetryable: true,
  },
  UNKNOWN: {
    title: "Sync failed",
    message: "An unexpected error occurred. Our team has been notified.",
    action: "Retry",
    isRetryable: true,
  },
};

const CONNECTOR_ERROR_OVERRIDES: Record<
  string,
  Partial<Record<ErrorCategory, UserFriendlyError>>
> = {
  gmail: {
    AUTH_ERROR: {
      title: "Gmail connection expired",
      message:
        "Your Gmail access has expired. Reconnect to continue syncing emails.",
      action: "Reconnect Gmail",
      isRetryable: false,
    },
    QUOTA_EXCEEDED: {
      title: "Gmail API quota exceeded",
      message: "Daily Gmail API limit reached. Sync will resume tomorrow.",
      action: "Wait",
      isRetryable: true,
    },
  },
  linear: {
    AUTH_ERROR: {
      title: "Linear API key invalid",
      message: "Your Linear API key is invalid or has been revoked.",
      action: "Update API key",
      isRetryable: false,
    },
  },
  notion: {
    PERMISSION_DENIED: {
      title: "Notion permissions changed",
      message:
        "OpenBeam no longer has access to some pages. Grant permissions to continue.",
      action: "Grant access",
      isRetryable: false,
    },
  },
  slack: {
    RATE_LIMIT: {
      title: "Slack rate limit",
      message: "Slack API rate limit reached. Sync will resume in ~1 minute.",
      action: "Wait",
      isRetryable: true,
    },
  },
  "google-drive": {
    QUOTA_EXCEEDED: {
      title: "Drive API quota exceeded",
      message:
        "Daily Google Drive API limit reached. Sync will resume tomorrow.",
      action: "Wait",
      isRetryable: true,
    },
  },
};

function categorizeError(errorMessage: string): ErrorCategory {
  for (const { pattern, category } of ERROR_PATTERNS) {
    if (pattern.test(errorMessage)) {
      return category;
    }
  }
  return "UNKNOWN";
}

export function getUserFriendlyError(
  rawError: string | undefined,
  connectorName?: string
): UserFriendlyError {
  if (!rawError) {
    return ERROR_MESSAGES.UNKNOWN;
  }

  const category = categorizeError(rawError);
  const normalizedConnectorName = connectorName
    ?.toLowerCase()
    .replace(/_/g, "-");

  if (normalizedConnectorName) {
    const connectorOverride =
      CONNECTOR_ERROR_OVERRIDES[normalizedConnectorName]?.[category];
    if (connectorOverride) {
      return connectorOverride;
    }
  }

  return ERROR_MESSAGES[category];
}
