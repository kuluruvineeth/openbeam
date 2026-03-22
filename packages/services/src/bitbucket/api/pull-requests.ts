import {
  type BitbucketComment,
  BitbucketCommentSchema,
  type BitbucketPullRequest,
  BitbucketPullRequestSchema,
} from "@openbeam/types/services/connectors/bitbucket";
import { z } from "zod";
import type { BitbucketClient } from "../client";

const PRPageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketPullRequestSchema),
  next: z.string().optional(),
});

const CommentPageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketCommentSchema),
  next: z.string().optional(),
});

export async function* getAllPullRequests(
  client: BitbucketClient,
  repoSlug: string,
  since?: string
): AsyncGenerator<BitbucketPullRequest> {
  let url: string | undefined =
    `/repositories/${client.workspace}/${repoSlug}/pullrequests`;

  const query: Record<string, string> = {
    pagelen: "50",
    state: "OPEN,MERGED,DECLINED,SUPERSEDED",
  };

  if (since) {
    query.q = `updated_on>="${since}"`;
    query.sort = "-updated_on";
  }

  while (url) {
    const raw = url.startsWith("http")
      ? await client.getFullUrl<unknown>(url)
      : await client.get<unknown>(url, query);

    const page = PRPageSchema.parse(raw);

    for (const pr of page.values) {
      yield pr;
    }

    url = page.next;
  }
}

export async function getPRComments(
  client: BitbucketClient,
  repoSlug: string,
  prId: number
): Promise<BitbucketComment[]> {
  const comments: BitbucketComment[] = [];
  let url: string | undefined =
    `/repositories/${client.workspace}/${repoSlug}/pullrequests/${prId}/comments`;

  while (url) {
    const raw = url.startsWith("http")
      ? await client.getFullUrl<unknown>(url)
      : await client.get<unknown>(url, { pagelen: "100" });

    const page = CommentPageSchema.parse(raw);
    comments.push(...page.values);
    url = page.next;
  }

  return comments;
}
