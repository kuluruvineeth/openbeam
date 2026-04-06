import {
  addIssueComment,
  addPRComment,
  createIssue,
  createPullRequest,
} from "../../bitbucket/actions";
import {
  type BitbucketClient,
  createBitbucketClient,
} from "../../bitbucket/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { str } from "./shared/params";

type Handler = (
  client: BitbucketClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async issue_create(client, p) {
    const r = await createIssue(client, {
      repoSlug: str(p, "repoSlug"),
      title: str(p, "title"),
      content: typeof p.content === "string" ? p.content : undefined,
      kind: typeof p.kind === "string" ? p.kind : undefined,
      priority: typeof p.priority === "string" ? p.priority : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async issue_comment(client, p) {
    const r = await addIssueComment(client, {
      repoSlug: str(p, "repoSlug"),
      issueId:
        typeof p.issueId === "number" ? p.issueId : Number(str(p, "issueId")),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async pr_create(client, p) {
    const r = await createPullRequest(client, {
      repoSlug: str(p, "repoSlug"),
      title: str(p, "title"),
      sourceBranch: str(p, "sourceBranch"),
      destinationBranch: str(p, "destinationBranch"),
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async pr_comment(client, p) {
    const r = await addPRComment(client, {
      repoSlug: str(p, "repoSlug"),
      prId: typeof p.prId === "number" ? p.prId : Number(str(p, "prId")),
      body: str(p, "body"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "bitbucket",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Bitbucket action: ${actionId}`,
      };
    }

    const client = createBitbucketClient({
      connectorId,
      accessToken: credentials.accessToken,
      workspace: (credentials.config.workspace as string) ?? "",
    });

    return await handler(client, params);
  },
});
