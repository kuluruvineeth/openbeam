import { z } from "zod";

export const DriveUserSchema = z.object({
  displayName: z.string().optional(),
  kind: z.literal("drive#user").optional(),
  me: z.boolean().optional(),
  permissionId: z.string().optional(),
  emailAddress: z.string().optional(),
  photoLink: z.string().optional(),
});

export type DriveUser = z.infer<typeof DriveUserSchema>;

export const DriveCapabilitiesSchema = z.object({
  canAddChildren: z.boolean().optional(),
  canAddMyDriveParent: z.boolean().optional(),
  canChangeCopyRequiresWriterPermission: z.boolean().optional(),
  canChangeViewersCanCopyContent: z.boolean().optional(),
  canComment: z.boolean().optional(),
  canCopy: z.boolean().optional(),
  canDelete: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canListChildren: z.boolean().optional(),
  canModifyContent: z.boolean().optional(),
  canMoveChildrenOutOfDrive: z.boolean().optional(),
  canMoveChildrenWithinDrive: z.boolean().optional(),
  canMoveItemIntoTeamDrive: z.boolean().optional(),
  canMoveItemOutOfDrive: z.boolean().optional(),
  canMoveItemWithinDrive: z.boolean().optional(),
  canReadRevisions: z.boolean().optional(),
  canRemoveChildren: z.boolean().optional(),
  canRemoveMyDriveParent: z.boolean().optional(),
  canRename: z.boolean().optional(),
  canShare: z.boolean().optional(),
  canTrash: z.boolean().optional(),
  canUntrash: z.boolean().optional(),
});

export type DriveCapabilities = z.infer<typeof DriveCapabilitiesSchema>;

export const DrivePermissionSchema = z.object({
  id: z.string(),
  type: z.enum(["user", "group", "domain", "anyone"]),
  role: z.enum([
    "owner",
    "organizer",
    "fileOrganizer",
    "writer",
    "commenter",
    "reader",
  ]),
  emailAddress: z.string().optional(),
  domain: z.string().optional(),
  displayName: z.string().optional(),
  photoLink: z.string().optional(),
  expirationTime: z.string().optional(),
  deleted: z.boolean().optional(),
  allowFileDiscovery: z.boolean().optional(),
  pendingOwner: z.boolean().optional(),
});

export type DrivePermission = z.infer<typeof DrivePermissionSchema>;

export const DriveImageMediaMetadataSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  rotation: z.number().optional(),
  time: z.string().optional(),
});

export const DriveVideoMediaMetadataSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  durationMillis: z.string().optional(),
});

export const DriveShortcutDetailsSchema = z.object({
  targetId: z.string(),
  targetMimeType: z.string(),
  targetResourceKey: z.string().optional(),
});

export const DriveLinkShareMetadataSchema = z.object({
  securityUpdateEligible: z.boolean().optional(),
  securityUpdateEnabled: z.boolean().optional(),
});

export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  kind: z.literal("drive#file").optional(),
  driveId: z.string().optional(),
  starred: z.boolean().optional(),
  trashed: z.boolean().optional(),
  explicitlyTrashed: z.boolean().optional(),
  parents: z.array(z.string()).optional(),
  spaces: z.array(z.string()).optional(),
  version: z.string().optional(),
  webContentLink: z.string().optional(),
  webViewLink: z.string().optional(),
  iconLink: z.string().optional(),
  hasThumbnail: z.boolean().optional(),
  thumbnailLink: z.string().optional(),
  thumbnailVersion: z.string().optional(),
  viewedByMe: z.boolean().optional(),
  viewedByMeTime: z.string().optional(),
  createdTime: z.string().optional(),
  modifiedTime: z.string().optional(),
  modifiedByMeTime: z.string().optional(),
  modifiedByMe: z.boolean().optional(),
  sharedWithMeTime: z.string().optional(),
  sharingUser: DriveUserSchema.optional(),
  owners: z.array(DriveUserSchema).optional(),
  teamDriveId: z.string().optional(),
  lastModifyingUser: DriveUserSchema.optional(),
  shared: z.boolean().optional(),
  ownedByMe: z.boolean().optional(),
  capabilities: DriveCapabilitiesSchema.optional(),
  viewersCanCopyContent: z.boolean().optional(),
  copyRequiresWriterPermission: z.boolean().optional(),
  writersCanShare: z.boolean().optional(),
  permissions: z.array(DrivePermissionSchema).optional(),
  permissionIds: z.array(z.string()).optional(),
  hasAugmentedPermissions: z.boolean().optional(),
  folderColorRgb: z.string().optional(),
  originalFilename: z.string().optional(),
  fullFileExtension: z.string().optional(),
  fileExtension: z.string().optional(),
  md5Checksum: z.string().optional(),
  sha1Checksum: z.string().optional(),
  sha256Checksum: z.string().optional(),
  size: z.string().optional(),
  quotaBytesUsed: z.string().optional(),
  headRevisionId: z.string().optional(),
  contentHints: z
    .object({
      indexableText: z.string().optional(),
      thumbnail: z
        .object({
          image: z.string().optional(),
          mimeType: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  imageMediaMetadata: DriveImageMediaMetadataSchema.optional(),
  videoMediaMetadata: DriveVideoMediaMetadataSchema.optional(),
  isAppAuthorized: z.boolean().optional(),
  exportLinks: z.record(z.string(), z.string()).optional(),
  shortcutDetails: DriveShortcutDetailsSchema.optional(),
  linkShareMetadata: DriveLinkShareMetadataSchema.optional(),
  resourceKey: z.string().optional(),
  description: z.string().optional(),
});

export type DriveFile = z.infer<typeof DriveFileSchema>;

export const DriveFileListResponseSchema = z.object({
  kind: z.literal("drive#fileList").optional(),
  nextPageToken: z.string().optional(),
  incompleteSearch: z.boolean().optional(),
  files: z.array(DriveFileSchema).optional(),
});

export type DriveFileListResponse = z.infer<typeof DriveFileListResponseSchema>;

export const DriveChangeSchema = z.object({
  kind: z.literal("drive#change").optional(),
  removed: z.boolean().optional(),
  file: DriveFileSchema.optional(),
  fileId: z.string().optional(),
  time: z.string().optional(),
  driveId: z.string().optional(),
  type: z.enum(["file", "drive"]).optional(),
  changeType: z.string().optional(),
  drive: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
});

export type DriveChange = z.infer<typeof DriveChangeSchema>;

export const DriveChangesListResponseSchema = z.object({
  kind: z.literal("drive#changeList").optional(),
  nextPageToken: z.string().optional(),
  newStartPageToken: z.string().optional(),
  changes: z.array(DriveChangeSchema).optional(),
});

export type DriveChangesListResponse = z.infer<
  typeof DriveChangesListResponseSchema
>;

export const DriveStartPageTokenResponseSchema = z.object({
  kind: z.literal("drive#startPageToken").optional(),
  startPageToken: z.string(),
});

export type DriveStartPageTokenResponse = z.infer<
  typeof DriveStartPageTokenResponseSchema
>;

export const SharedDriveBackgroundImageFileSchema = z.object({
  id: z.string().optional(),
  xCoordinate: z.number().optional(),
  yCoordinate: z.number().optional(),
  width: z.number().optional(),
});

export const SharedDriveCapabilitiesSchema = z.object({
  canAddChildren: z.boolean().optional(),
  canChangeCopyRequiresWriterPermissionRestriction: z.boolean().optional(),
  canChangeDomainUsersOnlyRestriction: z.boolean().optional(),
  canChangeDriveBackground: z.boolean().optional(),
  canChangeDriveMembersOnlyRestriction: z.boolean().optional(),
  canComment: z.boolean().optional(),
  canCopy: z.boolean().optional(),
  canDeleteChildren: z.boolean().optional(),
  canDeleteDrive: z.boolean().optional(),
  canDownload: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  canListChildren: z.boolean().optional(),
  canManageMembers: z.boolean().optional(),
  canReadRevisions: z.boolean().optional(),
  canRename: z.boolean().optional(),
  canRenameDrive: z.boolean().optional(),
  canResetDriveRestrictions: z.boolean().optional(),
  canShare: z.boolean().optional(),
  canTrashChildren: z.boolean().optional(),
});

export const SharedDriveRestrictionsSchema = z.object({
  adminManagedRestrictions: z.boolean().optional(),
  copyRequiresWriterPermission: z.boolean().optional(),
  domainUsersOnly: z.boolean().optional(),
  driveMembersOnly: z.boolean().optional(),
});

export const SharedDriveSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.literal("drive#drive").optional(),
  colorRgb: z.string().optional(),
  backgroundImageFile: SharedDriveBackgroundImageFileSchema.optional(),
  backgroundImageLink: z.string().optional(),
  capabilities: SharedDriveCapabilitiesSchema.optional(),
  themeId: z.string().optional(),
  createdTime: z.string().optional(),
  hidden: z.boolean().optional(),
  restrictions: SharedDriveRestrictionsSchema.optional(),
  orgUnitId: z.string().optional(),
});

export type SharedDrive = z.infer<typeof SharedDriveSchema>;

export const SharedDriveListResponseSchema = z.object({
  kind: z.literal("drive#driveList").optional(),
  nextPageToken: z.string().optional(),
  drives: z.array(SharedDriveSchema).optional(),
});

export type SharedDriveListResponse = z.infer<
  typeof SharedDriveListResponseSchema
>;

export const DriveAboutStorageQuotaSchema = z.object({
  limit: z.string().optional(),
  usageInDrive: z.string().optional(),
  usageInDriveTrash: z.string().optional(),
  usage: z.string().optional(),
});

export const DriveAboutUserSchema = z.object({
  displayName: z.string().optional(),
  photoLink: z.string().optional(),
  me: z.boolean().optional(),
  permissionId: z.string().optional(),
  emailAddress: z.string().optional(),
});

export const DriveAboutSchema = z.object({
  kind: z.literal("drive#about").optional(),
  user: DriveAboutUserSchema.optional(),
  storageQuota: DriveAboutStorageQuotaSchema.optional(),
  canCreateDrives: z.boolean().optional(),
  maxUploadSize: z.string().optional(),
  appInstalled: z.boolean().optional(),
  folderColorPalette: z.array(z.string()).optional(),
  canCreateTeamDrives: z.boolean().optional(),
  maxImportSizes: z.record(z.string(), z.string()).optional(),
  exportFormats: z.record(z.string(), z.array(z.string())).optional(),
  importFormats: z.record(z.string(), z.array(z.string())).optional(),
});

export type DriveAbout = z.infer<typeof DriveAboutSchema>;

export const DriveWatchChannelSchema = z.object({
  id: z.string(),
  resourceId: z.string().optional(),
  resourceUri: z.string().optional(),
  token: z.string().optional(),
  expiration: z.string().optional(),
  type: z.string().optional(),
  address: z.string().optional(),
  payload: z.boolean().optional(),
  kind: z.literal("api#channel").optional(),
});

export type DriveWatchChannel = z.infer<typeof DriveWatchChannelSchema>;

export interface GoogleDriveSyncCursor {
  startPageToken?: string;
  lastFullSync?: number;
  watchChannelId?: string;
  watchResourceId?: string;
  watchExpiration?: number;
}

export interface GoogleDriveDomainSyncCursor {
  users: Record<string, { startPageToken?: string; lastSyncedAt?: number }>;
  sharedDrives: Record<string, { startPageToken?: string }>;
  lastUserListSync?: number;
}

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

export interface GoogleDriveSyncOptions {
  cursor?: GoogleDriveSyncCursor;
  batchSize?: number;
  forceFullSync?: boolean;
  includeSharedDrives?: boolean;
  includeTrashed?: boolean;
  mimeTypeFilter?: string[];
  lookbackDays?: number;
  indexMedia?: boolean;
}

export interface GoogleDriveSyncBatch<T> {
  items: T[];
  cursor: GoogleDriveSyncCursor;
  hasMore: boolean;
  stats: {
    processed: number;
    skipped: number;
    errors: number;
  };
}

export interface GoogleDriveTransformContext {
  connectorId: string;
  connectorType: string;
  teamId: string;
  workspaceId: string;
  userEmail: string;
}

export interface GoogleDriveClientConfig {
  accessToken: string;
  connectorId: string;
  userEmail?: string;
  rateLimitConfig?: GoogleDriveRateLimitConfig;
  timeout?: number;
  debug?: boolean;
}

export interface GoogleDriveRateLimitConfig {
  requestsPerMinute?: number;
  requestsPerHour?: number;
  burstLimit?: number;
}

export interface GoogleDriveRateLimitState {
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

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

export interface DriveFileInfo {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

export interface DriveMediaInfo {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  mediaType: "video" | "audio" | "image";
  webViewLink?: string;
  thumbnailLink?: string;
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

/**
 * Google file types that cannot be exported or have no useful content.
 * These should be skipped during sync.
 */
export const UNEXPORTABLE_GOOGLE_TYPES = new Set([
  GOOGLE_WORKSPACE_MIME_TYPES.SHORTCUT,
  GOOGLE_WORKSPACE_MIME_TYPES.SCRIPT,
  GOOGLE_WORKSPACE_MIME_TYPES.SITE,
  GOOGLE_WORKSPACE_MIME_TYPES.DRIVE_SDK,
  GOOGLE_WORKSPACE_MIME_TYPES.JAM,
  GOOGLE_WORKSPACE_MIME_TYPES.MAP,
  "application/vnd.google-makersuite.prompt", // Google AI Studio prompts
]);

export function isUnexportableGoogleType(mimeType: string): boolean {
  return UNEXPORTABLE_GOOGLE_TYPES.has(mimeType);
}
