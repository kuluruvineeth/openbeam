export interface DropboxFolderCreateResult {
  id: string | undefined;
  path: unknown;
  url: string | undefined;
}

export interface DropboxEntryMoveResult {
  id: string | undefined;
  path: unknown;
  url: string | undefined;
}

export interface DropboxEntryDeleteResult {
  path: unknown;
}

export interface DropboxActionResults {
  folder_create: DropboxFolderCreateResult;
  entry_move: DropboxEntryMoveResult;
  entry_delete: DropboxEntryDeleteResult;
}
