import {
  type GitLabIssue,
  GitLabIssueSchema,
  type GitLabNote,
  GitLabNoteSchema,
} from "@openbeam/types/services/connectors/gitlab";
import type { GitLabClient } from "../client";

export async function* getAllProjectIssues(
  client: GitLabClient,
  projectId: number,
  updatedAfter?: string
): AsyncGenerator<GitLabIssue> {
  const query: Record<string, string> = {
    order_by: "updated_at",
    sort: "desc",
    per_page: "100",
    scope: "all",
  };

  if (updatedAfter) {
    query.updated_after = updatedAfter;
  }

  for await (const page of client.paginate<unknown>(
    `/projects/${projectId}/issues`,
    query
  )) {
    for (const raw of page) {
      const parsed = GitLabIssueSchema.safeParse(raw);
      if (parsed.success) {
        yield parsed.data;
      }
    }
  }
}

export async function* getIssueNotes(
  client: GitLabClient,
  projectId: number,
  issueIid: number
): AsyncGenerator<GitLabNote> {
  const query: Record<string, string> = {
    order_by: "created_at",
    sort: "asc",
    per_page: "100",
  };

  for await (const page of client.paginate<unknown>(
    `/projects/${projectId}/issues/${issueIid}/notes`,
    query
  )) {
    for (const raw of page) {
      const parsed = GitLabNoteSchema.safeParse(raw);
      if (parsed.success && !parsed.data.system) {
        yield parsed.data;
      }
    }
  }
}
