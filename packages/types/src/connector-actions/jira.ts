export interface JiraIssueCreateResult {
  issueId: string | undefined;
  issueKey: string | undefined;
  url: string | undefined;
}

export interface JiraIssueUpdateResult {
  issueKey: string | undefined;
}

export interface JiraIssueTransitionResult {
  transitioned: true;
}

export interface JiraIssueAssignResult {
  assigned: true;
}

export interface JiraIssueDeleteResult {
  deleted: true;
}

export interface JiraIssueCommentResult {
  commentId: string | undefined;
}

export interface JiraActionResults {
  issue_create: JiraIssueCreateResult;
  issue_update: JiraIssueUpdateResult;
  issue_transition: JiraIssueTransitionResult;
  issue_assign: JiraIssueAssignResult;
  issue_delete: JiraIssueDeleteResult;
  issue_comment: JiraIssueCommentResult;
}
