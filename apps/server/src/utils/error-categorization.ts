type ErrorCategory = {
  errorType: string;
  errorCode?: string;
};

const ERROR_PATTERNS = {
  database: ["prisma", "database", "connection", "query"],
  validation: ["validation", "invalid", "required"],
  auth: [
    "auth",
    "unauthorized",
    "forbidden",
    "authentication",
    "authorization",
  ],
  network: ["timeout", "network", "econnrefused", "enotfound"],
  rateLimit: ["rate limit", "too many requests"],
  externalService: ["vespa", "connector", "external"],
} as const;

function matchesPattern(text: string, patterns: readonly string[]): boolean {
  const lowerText = text.toLowerCase();
  return patterns.some((pattern) => lowerText.includes(pattern));
}

export function categorizeError(error: unknown): ErrorCategory {
  if (!error) {
    return { errorType: "unknown" };
  }

  if (error instanceof Error) {
    const errorName = error.constructor.name;
    const errorText = `${errorName} ${error.message}`;

    if (matchesPattern(errorText, ERROR_PATTERNS.database)) {
      return { errorType: "database_error", errorCode: errorName };
    }

    if (matchesPattern(errorText, ERROR_PATTERNS.validation)) {
      return { errorType: "validation_error", errorCode: errorName };
    }

    if (matchesPattern(errorText, ERROR_PATTERNS.auth)) {
      return { errorType: "auth_error", errorCode: errorName };
    }

    if (matchesPattern(errorText, ERROR_PATTERNS.network)) {
      return { errorType: "network_error", errorCode: errorName };
    }

    if (matchesPattern(errorText, ERROR_PATTERNS.rateLimit)) {
      return { errorType: "rate_limit_error", errorCode: errorName };
    }

    if (matchesPattern(errorText, ERROR_PATTERNS.externalService)) {
      return { errorType: "external_service_error", errorCode: errorName };
    }

    return { errorType: "application_error", errorCode: errorName };
  }

  return {
    errorType: "unknown",
    errorCode: typeof error === "string" ? "StringError" : "Unknown",
  };
}

export function getStatusCategory(statusCode: number): string {
  if (statusCode >= 500) {
    return "server_error";
  }
  if (statusCode >= 400) {
    return "client_error";
  }
  if (statusCode >= 300) {
    return "redirect";
  }
  if (statusCode >= 200) {
    return "success";
  }
  return "informational";
}
