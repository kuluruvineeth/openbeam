import {
  addIssueNote,
  addMergeRequestNote,
  createIssue,
  createMergeRequest,
  listProjects,
  updateIssue,
} from "../../gitlab/actions";
import { createGitLabClient, type GitLabClient } from "../../gitlab/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";
import { num, str } from "./shared/params";

type Handler = (
  client: GitLabClient,
  p: Record<string, unknown>
) => Promise<ActionExecutionResult>;

const actions: Record<string, Handler> = {
  async project_list(client, p) {
    const visibility =
      typeof p.visibility === "string" ? p.visibility : undefined;
    const limit = typeof p.limit === "number" ? p.limit : undefined;
    const r = await listProjects(client, { visibility, limit });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { projects: r.projects } };
  },

  async issue_create(client, p) {
    const r = await createIssue(client, num(p, "projectId"), {
      title: str(p, "title"),
      description:
        typeof p.description === "string" ? p.description : undefined,
      labels: typeof p.labels === "string" ? p.labels : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async issue_update(client, p) {
    const r = await updateIssue(
      client,
      num(p, "projectId"),
      num(p, "issueIid"),
      {
        title: typeof p.title === "string" ? p.title : undefined,
        description:
          typeof p.description === "string" ? p.description : undefined,
        state_event:
          typeof p.stateEvent === "string" ? p.stateEvent : undefined,
      }
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async issue_note(client, p) {
    const r = await addIssueNote(
      client,
      num(p, "projectId"),
      num(p, "issueIid"),
      str(p, "body")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async mr_create(client, p) {
    const r = await createMergeRequest(client, num(p, "projectId"), {
      title: str(p, "title"),
      source_branch: str(p, "sourceBranch"),
      target_branch: str(p, "targetBranch"),
      description:
        typeof p.description === "string" ? p.description : undefined,
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async mr_note(client, p) {
    const r = await addMergeRequestNote(
      client,
      num(p, "projectId"),
      num(p, "mrIid"),
      str(p, "body")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },
};

registerHandler({
  connectorType: "gitlab",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported GitLab action: ${actionId}`,
      };
    }

    const client = createGitLabClient({
      connectorId,
      accessToken: credentials.accessToken,
      instanceUrl: (credentials.config.instanceUrl as string) ?? undefined,
    });

    return await handler(client, params);
  },
});
