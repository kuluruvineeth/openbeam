export interface InsidedIdeaCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface InsidedIdeaVoteResult {
  voted: true;
}

export interface InsidedPostCreateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface InsidedPostReplyResult {
  id: string | undefined;
}

export interface InsidedActionResults {
  idea_create: InsidedIdeaCreateResult;
  idea_vote: InsidedIdeaVoteResult;
  post_create: InsidedPostCreateResult;
  post_reply: InsidedPostReplyResult;
}
