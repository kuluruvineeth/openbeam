export interface BitbucketIssueCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BitbucketIssueCommentResult {
  id: string | undefined;
}

export interface BitbucketPrCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface BitbucketPrCommentResult {
  id: string | undefined;
}

export interface BitbucketActionResults {
  issue_create: BitbucketIssueCreateResult;
  issue_comment: BitbucketIssueCommentResult;
  pr_create: BitbucketPrCreateResult;
  pr_comment: BitbucketPrCommentResult;
}
