export interface SharepointFolderCreateResult {
  fileId: string | undefined;
  url: string | undefined;
}

export interface SharepointFileMoveResult {
  fileId: string | undefined;
  url: string | undefined;
}

export interface SharepointDriveListResult {
  drives: unknown[];
}

export interface SharepointSiteListResult {
  sites: unknown[];
}

export interface SharepointActionResults {
  folder_create: SharepointFolderCreateResult;
  file_move: SharepointFileMoveResult;
  drive_list: SharepointDriveListResult;
  site_list: SharepointSiteListResult;
}
