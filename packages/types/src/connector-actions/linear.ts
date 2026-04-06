export interface LinearIssueCreateResult {
  id: string | undefined;
  identifier: string | undefined;
  url: string | undefined;
}

export interface LinearIssueUpdateResult {
  success: true;
}

export interface LinearIssueSearchResult {
  issues: unknown[] | undefined;
  totalCount: number | undefined;
}

export interface LinearIssueAssignResult {
  success: true;
}

export interface LinearIssueAddCommentResult {
  id: string | undefined;
}

export interface LinearIssueAddLabelResult {
  success: true;
}

export interface LinearProjectGetResult {
  project: unknown | undefined;
}

export interface LinearProjectCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LinearCycleGetResult {
  cycle: unknown | undefined;
}

export interface LinearCycleAddIssueResult {
  success: true;
}

export interface LinearTeamListResult {
  teams: unknown[] | undefined;
}

export interface LinearActionResults {
  issue_create: LinearIssueCreateResult;
  issue_update: LinearIssueUpdateResult;
  issue_search: LinearIssueSearchResult;
  issue_assign: LinearIssueAssignResult;
  issue_add_comment: LinearIssueAddCommentResult;
  issue_add_label: LinearIssueAddLabelResult;
  project_get: LinearProjectGetResult;
  project_create: LinearProjectCreateResult;
  cycle_get: LinearCycleGetResult;
  cycle_add_issue: LinearCycleAddIssueResult;
  team_list: LinearTeamListResult;
}
