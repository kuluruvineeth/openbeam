export interface GitlabIssueCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface GitlabIssueUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface GitlabIssueNoteResult {
  id: string | undefined;
}

export interface GitlabMrCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface GitlabMrNoteResult {
  id: string | undefined;
}

export interface GitlabActionResults {
  issue_create: GitlabIssueCreateResult;
  issue_update: GitlabIssueUpdateResult;
  issue_note: GitlabIssueNoteResult;
  mr_create: GitlabMrCreateResult;
  mr_note: GitlabMrNoteResult;
}
