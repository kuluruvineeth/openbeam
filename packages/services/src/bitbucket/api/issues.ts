import {
  type BitbucketComment,
  BitbucketCommentSchema,
  type BitbucketIssue,
  BitbucketIssueSchema,
} from "@openbeam/types/services/connectors/bitbucket";
import { z } from "zod";
import type { BitbucketClient } from "../client";

const IssuePageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketIssueSchema),
  next: z.string().optional(),
});

const CommentPageSchema = z.object({
  pagelen: z.number(),
  values: z.array(BitbucketCommentSchema),
  next: z.string().optional(),
});

export async function* getAllIssues(
  client: BitbucketClient,
  repoSlug: string,
  since?: string
): AsyncGenerator<BitbucketIssue> {
  let url: string | undefined =
    `/repositories/${client.workspace}/${repoSlug}/issues`;

  const query: Record<string, string> = { pagelen: "50" };

  if (since) {
    query.q = `updated_on>="${since}"`;
    query.sort = "-updated_on";
  }

  while (url) {
    const raw = url.startsWith("http")
      ? await client.getFullUrl<unknown>(url)
      : await client.get<unknown>(url, query);

    const page = IssuePageSchema.parse(raw);

    for (const issue of page.values) {
      yield issue;
    }

    url = page.next;
  }
}

export async function getIssueComments(
  client: BitbucketClient,
  repoSlug: string,
  issueId: number
): Promise<BitbucketComment[]> {
  const comments: BitbucketComment[] = [];
  let url: string | undefined =
    `/repositories/${client.workspace}/${repoSlug}/issues/${issueId}/comments`;

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
