export interface ClickupWorkspaceListResult {
  items: unknown[];
}

export interface ClickupSpaceListResult {
  items: unknown[];
}

export interface ClickupFolderListResult {
  items: unknown[];
}

export interface ClickupListListResult {
  items: unknown[];
}

export interface ClickupTaskCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface ClickupTaskUpdateResult {
  id: string | undefined;
}

export interface ClickupTaskCommentResult {
  id: string | undefined;
}

export interface ClickupActionResults {
  workspace_list: ClickupWorkspaceListResult;
  space_list: ClickupSpaceListResult;
  folder_list: ClickupFolderListResult;
  list_list: ClickupListListResult;
  task_create: ClickupTaskCreateResult;
  task_update: ClickupTaskUpdateResult;
  task_comment: ClickupTaskCommentResult;
}
