import {
  type AtlassianClient,
  createAtlassianClient,
} from "../../atlassian/client";
import {
  addComment,
  assignIssue,
  createIssue,
  deleteIssue,
  transitionIssueStatus,
  updateIssue,
} from "../../jira/actions";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: AtlassianClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

function str(p: Record<string, unknown>, key: string): string {
  const v = p[key];
  if (typeof v === "string" && v.trim()) {
    return v.trim();
  }
  throw new Error(`${key} is required`);
}

const actions: Record<string, Handler> = {
  async issue_create(client, p) {
    const r = await createIssue(client, {
      projectKey: str(p, "projectKey"),
      summary: str(p, "summary"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      issueType: typeof p.issueType === "string" ? p.issueType : "Task",
      assigneeId: typeof p.assigneeId === "string" ? p.assigneeId : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      labels: Array.isArray(p.labels) ? (p.labels as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { issueId: r.issueId, issueKey: r.issueKey, url: r.url },
    };
  },

  async issue_update(client, p) {
    const r = await updateIssue(client, str(p, "issueKey"), {
      summary: typeof p.summary === "string" ? p.summary : undefined,
      description:
        typeof p.description === "string" ? p.description : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
      labels: Array.isArray(p.labels) ? (p.labels as string[]) : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { issueKey: r.issueKey } };
  },

  async issue_transition(client, p) {
    const r = await transitionIssueStatus(
      client,
      str(p, "issueKey"),
      str(p, "targetStatus")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { transitioned: true } };
  },

  async issue_assign(client, p) {
    const r = await assignIssue(
      client,
      str(p, "issueKey"),
      str(p, "accountId")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { assigned: true } };
  },

  async issue_delete(client, p) {
    const r = await deleteIssue(client, str(p, "issueKey"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { deleted: true } };
  },

  async issue_comment(client, p) {
    const r = await addComment(client, str(p, "issueKey"), str(p, "body"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { commentId: r.commentId } };
  },
};

registerHandler({
  connectorType: "jira",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Jira action: ${actionId}`,
      };
    }

    const client = createAtlassianClient({
      connectorId,
      accessToken: credentials.accessToken,
      cloudId: (credentials.config.cloudId as string) ?? "",
      product: "jira",
    });

    return await handler(client, params);
  },
});
