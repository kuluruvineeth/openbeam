export const SlackErrorCodes = {
  RATE_LIMITED: "ratelimited",
  NOT_AUTHED: "not_authed",
  INVALID_AUTH: "invalid_auth",
  TOKEN_EXPIRED: "token_expired",
  TOKEN_REVOKED: "token_revoked",
  ACCOUNT_INACTIVE: "account_inactive",
  CHANNEL_NOT_FOUND: "channel_not_found",
  NOT_IN_CHANNEL: "not_in_channel",
  USER_NOT_FOUND: "user_not_found",
  MISSING_SCOPE: "missing_scope",
  INTERNAL_ERROR: "internal_error",
} as const;

export type SlackErrorCode =
  (typeof SlackErrorCodes)[keyof typeof SlackErrorCodes];

export class SlackApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;

  constructor(
    message: string,
    code: string,
    retryable = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = "SlackApiError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }

  static fromResponse(error: string, retryAfter?: number): SlackApiError {
    const retryableCodes: readonly SlackErrorCode[] = [
      SlackErrorCodes.RATE_LIMITED,
      SlackErrorCodes.INTERNAL_ERROR,
    ];
    const retryable = retryableCodes.includes(error as SlackErrorCode);

    return new SlackApiError(
      `Slack API error: ${error}`,
      error,
      retryable,
      retryAfter
    );
  }

  static isAuthError(code: string): boolean {
    const authErrorCodes: readonly SlackErrorCode[] = [
      SlackErrorCodes.NOT_AUTHED,
      SlackErrorCodes.INVALID_AUTH,
      SlackErrorCodes.TOKEN_EXPIRED,
      SlackErrorCodes.TOKEN_REVOKED,
      SlackErrorCodes.ACCOUNT_INACTIVE,
    ];
    return authErrorCodes.includes(code as SlackErrorCode);
  }

  static isScopeError(code: string): boolean {
    return code === SlackErrorCodes.MISSING_SCOPE;
  }

  static getScopeErrorHelp(method: string): string {
    const scopeRequirements: Record<string, string> = {
      "search.messages": "search:read (user scope - requires sync token)",
      "files.list": "files:read",
      "files.info": "files:read",
      "conversations.history": "channels:history or groups:history",
      "conversations.list": "channels:read or groups:read",
      "canvases.sections.lookup": "canvases:read",
      "canvases.access.list": "canvases:read",
      "canvases.access.set": "canvases:write",
    };

    const requiredScope = scopeRequirements[method];
    if (requiredScope) {
      return `Method '${method}' requires scope: ${requiredScope}. Re-authenticate to add this scope.`;
    }
    return `Method '${method}' requires additional scopes. Re-authenticate with the required permissions.`;
  }
}
