export interface AsanaWorkspaceListResult {
  workspaces: unknown[];
}

export interface AsanaProjectListResult {
  projects: unknown[];
}

export interface AsanaTaskCreateResult {
  taskGid: string | undefined;
  url: string | undefined;
}

export interface AsanaTaskUpdateResult {
  taskGid: string | undefined;
}

export interface AsanaTaskCompleteResult {
  taskGid: string | undefined;
}

export interface AsanaTaskCommentResult {
  storyGid: string | undefined;
}

export interface AsanaActionResults {
  workspace_list: AsanaWorkspaceListResult;
  project_list: AsanaProjectListResult;
  task_create: AsanaTaskCreateResult;
  task_update: AsanaTaskUpdateResult;
  task_complete: AsanaTaskCompleteResult;
  task_comment: AsanaTaskCommentResult;
}
