export const GoogleDriveErrorCodes = {
  RATE_LIMITED: "rateLimitExceeded",
  QUOTA_EXCEEDED: "quotaExceeded",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
  INVALID_GRANT: "invalid_grant",
  BACKEND_ERROR: "backendError",
  SERVICE_UNAVAILABLE: "serviceUnavailable",
  PAGE_TOKEN_EXPIRED: "pageTokenExpired",
} as const;

export type GoogleDriveErrorCode =
  (typeof GoogleDriveErrorCodes)[keyof typeof GoogleDriveErrorCodes];

export interface GoogleDriveApiErrorOptions {
  message: string;
  code: string;
  retryable?: boolean;
  retryAfter?: number;
  statusCode?: number;
}

export class GoogleDriveApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfter?: number;
  readonly statusCode?: number;

  constructor(options: GoogleDriveApiErrorOptions) {
    super(options.message);
    this.name = "GoogleDriveApiError";
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.retryAfter = options.retryAfter;
    this.statusCode = options.statusCode;
  }

  static fromResponse(
    statusCode: number,
    errorBody: { error?: { message?: string; code?: number; status?: string } }
  ): GoogleDriveApiError {
    const message =
      errorBody.error?.message ?? `Google Drive API error: ${statusCode}`;
    const status = errorBody.error?.status ?? "UNKNOWN";

    const retryableCodes = [429, 500, 502, 503, 504];
    const retryable = retryableCodes.includes(statusCode);

    let code = status;
    if (statusCode === 401) {
      code = GoogleDriveErrorCodes.UNAUTHORIZED;
    }
    if (statusCode === 403) {
      code = GoogleDriveErrorCodes.FORBIDDEN;
    }
    if (statusCode === 404) {
      code = GoogleDriveErrorCodes.NOT_FOUND;
    }
    if (statusCode === 429) {
      code = GoogleDriveErrorCodes.RATE_LIMITED;
    }

    return new GoogleDriveApiError({ message, code, retryable, statusCode });
  }

  static isAuthError(code: string): boolean {
    return (
      code === GoogleDriveErrorCodes.UNAUTHORIZED ||
      code === GoogleDriveErrorCodes.INVALID_GRANT
    );
  }

  static isQuotaError(code: string): boolean {
    return (
      code === GoogleDriveErrorCodes.RATE_LIMITED ||
      code === GoogleDriveErrorCodes.QUOTA_EXCEEDED
    );
  }

  static isPageTokenExpired(code: string, message: string): boolean {
    return (
      code === GoogleDriveErrorCodes.NOT_FOUND && message.includes("pageToken")
    );
  }
}

export const GOOGLE_WORKSPACE_MIME_TYPES = {
  FOLDER: "application/vnd.google-apps.folder",
  DOCUMENT: "application/vnd.google-apps.document",
  SPREADSHEET: "application/vnd.google-apps.spreadsheet",
  PRESENTATION: "application/vnd.google-apps.presentation",
  FORM: "application/vnd.google-apps.form",
  DRAWING: "application/vnd.google-apps.drawing",
  SCRIPT: "application/vnd.google-apps.script",
  SITE: "application/vnd.google-apps.site",
  SHORTCUT: "application/vnd.google-apps.shortcut",
  DRIVE_SDK: "application/vnd.google-apps.drive-sdk",
  JAM: "application/vnd.google-apps.jam",
  MAP: "application/vnd.google-apps.map",
} as const;

export type GoogleWorkspaceMimeType =
  (typeof GOOGLE_WORKSPACE_MIME_TYPES)[keyof typeof GOOGLE_WORKSPACE_MIME_TYPES];

export function isGoogleWorkspaceType(mimeType: string): boolean {
  return mimeType.startsWith("application/vnd.google-apps.");
}

export function isFolder(mimeType: string): boolean {
  return mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER;
}

export function isShortcut(mimeType: string): boolean {
  return mimeType === GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT;
}

export const UNEXPORTABLE_GOOGLE_TYPES = new Set([
  GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT,
  GOOGLE_WORKSPACE_MIME_TYPES.SCRIPT,
  GOOGLE_WORKSPACE_MIME_TYPES.SITE,
  GOOGLE_WORKSPACE_MIME_TYPES.DRIVE_SDK,
  GOOGLE_WORKSPACE_MIME_TYPES.JAM,
  GOOGLE_WORKSPACE_MIME_TYPES.MAP,
  "application/vnd.google-makersuite.prompt",
]);

export function isUnexportableGoogleType(mimeType: string): boolean {
  return UNEXPORTABLE_GOOGLE_TYPES.has(mimeType);
}

import type {
  GoogleDriveDomainSyncCursor,
  GoogleDriveSyncCursor,
} from "@openbeam/types/services/connectors/google-drive";

export function isGoogleDriveSyncCursor(
  cursor: unknown
): cursor is GoogleDriveSyncCursor {
  if (!cursor || typeof cursor !== "object") {
    return false;
  }
  const c = cursor as Record<string, unknown>;
  return !("users" in c && "sharedDrives" in c);
}

export function isGoogleDriveDomainSyncCursor(
  cursor: unknown
): cursor is GoogleDriveDomainSyncCursor {
  if (!cursor || typeof cursor !== "object") {
    return false;
  }
  const c = cursor as Record<string, unknown>;
  return (
    "users" in c &&
    typeof c.users === "object" &&
    "sharedDrives" in c &&
    typeof c.sharedDrives === "object"
  );
}
