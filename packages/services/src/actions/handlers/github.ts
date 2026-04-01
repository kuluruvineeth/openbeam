import {
  addIssueComment,
  addPullRequestComment,
  createIssue,
  createPullRequest,
  getRepository,
  searchIssues,
} from "../../github/actions";
import { createGitHubClient, type GitHubClient } from "../../github/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: GitHubClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

function optStr(p: Record<string, unknown>, key: string): string | undefined {
  const v = p[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function num(p: Record<string, unknown>, key: string): number {
  const v = p[key];
  if (typeof v === "number") {
    return v;
  }
  const parsed = Number(str(p, key));
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

function optNum(p: Record<string, unknown>, key: string): number | undefined {
  const v = p[key];
  if (typeof v === "number") {
    return v;
  }
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return;
}

const actions: Record<string, Handler> = {
  async issue_create(client, p) {
    const r = await createIssue(client, str(p, "owner"), str(p, "repo"), {
      title: str(p, "title"),
      body: optStr(p, "body"),
      labels: Array.isArray(p.labels) ? (p.labels as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { issueNumber: r.issueNumber, url: r.url },
    };
  },

  async issue_comment(client, p) {
    const r = await addIssueComment(client, {
      owner: str(p, "owner"),
      repo: str(p, "repo"),
      issueNumber: num(p, "issueNumber"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId, url: r.url } };
  },

  async pull_request_create(client, p) {
    const r = await createPullRequest(client, str(p, "owner"), str(p, "repo"), {
      title: str(p, "title"),
      head: str(p, "head"),
      base: str(p, "base"),
      body: optStr(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { pullRequestNumber: r.pullRequestNumber, url: r.url },
    };
  },

  async pull_request_comment(client, p) {
    const r = await addPullRequestComment(client, {
      owner: str(p, "owner"),
      repo: str(p, "repo"),
      prNumber: num(p, "pullRequestNumber"),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },

  async issues_search(client, p) {
    const r = await searchIssues(
      client,
      str(p, "query"),
      optNum(p, "limit") ?? 20
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { items: r.items, totalCount: r.totalCount },
    };
  },

  async repository_get(client, p) {
    const r = await getRepository(client, str(p, "owner"), str(p, "repo"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { repository: r.repository } };
  },
};

registerHandler({
  connectorType: "github",
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported GitHub action: ${actionId}`,
      };
    }

    const client = createGitHubClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
