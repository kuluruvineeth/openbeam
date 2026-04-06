export interface GoogleDriveFileCreateResult {
  fileId: string | undefined;
}

export interface GoogleDriveFileCopyResult {
  fileId: string | undefined;
}

export interface GoogleDriveFileMoveResult {
  fileId: string | undefined;
}

export interface GoogleDriveFileRenameResult {
  fileId: string | undefined;
}

export interface GoogleDriveFileTrashResult {
  trashed: true;
}

export interface GoogleDriveFileUntrashResult {
  untrashed: true;
}

export interface GoogleDriveFileDeleteResult {
  deleted: true;
}

export interface GoogleDriveFolderCreateResult {
  folderId: string | undefined;
}

export interface GoogleDriveFolderRenameResult {
  folderId: string | undefined;
}

export interface GoogleDriveFolderMoveResult {
  folderId: string | undefined;
}

export interface GoogleDriveFolderTrashResult {
  trashed: true;
}

export interface GoogleDriveFolderDeleteResult {
  deleted: true;
}

export interface GoogleDrivePermissionShareResult {
  permissionId: string | undefined;
}

export interface GoogleDrivePermissionUpdateResult {
  permissionId: string | undefined;
}

export interface GoogleDrivePermissionRevokeResult {
  revoked: true;
}

export interface GoogleDrivePermissionTransferOwnershipResult {
  permissionId: string | undefined;
}

export interface GoogleDriveActionResults {
  file_create: GoogleDriveFileCreateResult;
  file_copy: GoogleDriveFileCopyResult;
  file_move: GoogleDriveFileMoveResult;
  file_rename: GoogleDriveFileRenameResult;
  file_trash: GoogleDriveFileTrashResult;
  file_untrash: GoogleDriveFileUntrashResult;
  file_delete: GoogleDriveFileDeleteResult;
  folder_create: GoogleDriveFolderCreateResult;
  folder_rename: GoogleDriveFolderRenameResult;
  folder_move: GoogleDriveFolderMoveResult;
  folder_trash: GoogleDriveFolderTrashResult;
  folder_delete: GoogleDriveFolderDeleteResult;
  permission_share: GoogleDrivePermissionShareResult;
  permission_update: GoogleDrivePermissionUpdateResult;
  permission_revoke: GoogleDrivePermissionRevokeResult;
  permission_transfer_ownership: GoogleDrivePermissionTransferOwnershipResult;
}
