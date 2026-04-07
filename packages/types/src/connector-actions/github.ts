export interface GithubIssueCreateResult {
  issueNumber: unknown;
  url: string | undefined;
}

export interface GithubIssueCommentResult {
  commentId: string | undefined;
  url: string | undefined;
}

export interface GithubPullRequestCreateResult {
  pullRequestNumber: unknown;
  url: string | undefined;
}

export interface GithubPullRequestCommentResult {
  commentId: string | undefined;
}

export interface GithubIssuesSearchResult {
  items: unknown[];
  totalCount: number;
}

export interface GithubRepositoryGetResult {
  repository: unknown;
}

export interface GithubActionResults {
  issue_create: GithubIssueCreateResult;
  issue_comment: GithubIssueCommentResult;
  pull_request_create: GithubPullRequestCreateResult;
  pull_request_comment: GithubPullRequestCommentResult;
  issues_search: GithubIssuesSearchResult;
  repository_get: GithubRepositoryGetResult;
}
