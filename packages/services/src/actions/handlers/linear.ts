import {
  addComment,
  addIssueToCycle,
  addLabel,
  createIssue,
  createProject,
  getCycle,
  getProject,
  listTeams,
  searchIssues,
  updateIssue,
} from "../../linear/actions";
import { createLinearClient, type LinearClient } from "../../linear/client";
import { registerHandler } from "../handler-registry";
import type { ActionExecutionResult } from "../types";

type Handler = (
  client: LinearClient,
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
    const r = await createIssue(client, {
      title: str(p, "title"),
      teamId: str(p, "teamId"),
      description: optStr(p, "description"),
      assigneeId: optStr(p, "assigneeId"),
      priority: optNum(p, "priority"),
      stateId: optStr(p, "stateId"),
      labelIds: Array.isArray(p.labelIds)
        ? (p.labelIds as string[])
        : undefined,
      projectId: optStr(p, "projectId"),
      cycleId: optStr(p, "cycleId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { id: r.id, identifier: r.identifier, url: r.url },
    };
  },

  async issue_update(client, p) {
    const r = await updateIssue(client, str(p, "issueId"), {
      title: optStr(p, "title"),
      description: optStr(p, "description"),
      assigneeId: optStr(p, "assigneeId"),
      priority: optNum(p, "priority"),
      stateId: optStr(p, "stateId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { success: true } };
  },

  async issue_search(client, p) {
    const r = await searchIssues(client, str(p, "query"), optNum(p, "first"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return {
      success: true,
      data: { issues: r.issues, totalCount: r.totalCount },
    };
  },

  async issue_assign(client, p) {
    const r = await updateIssue(client, str(p, "issueId"), {
      assigneeId: str(p, "assigneeId"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { success: true } };
  },

  async issue_add_comment(client, p) {
    const r = await addComment(client, str(p, "issueId"), str(p, "body"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id } };
  },

  async issue_add_label(client, p) {
    const r = await addLabel(client, str(p, "issueId"), str(p, "labelId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { success: true } };
  },

  async project_get(client, p) {
    const r = await getProject(client, str(p, "projectId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { project: r.project } };
  },

  async project_create(client, p) {
    const teamIds = p.teamIds;
    if (!Array.isArray(teamIds) || teamIds.length === 0) {
      return { success: false, data: {}, error: "teamIds is required" };
    }
    const r = await createProject(client, {
      name: str(p, "name"),
      teamIds: teamIds as string[],
      description: optStr(p, "description"),
      leadId: optStr(p, "leadId"),
      targetDate: optStr(p, "targetDate"),
    });
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { id: r.id, url: r.url } };
  },

  async cycle_get(client, p) {
    const r = await getCycle(client, str(p, "cycleId"));
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { cycle: r.cycle } };
  },

  async cycle_add_issue(client, p) {
    const r = await addIssueToCycle(
      client,
      str(p, "issueId"),
      str(p, "cycleId")
    );
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { success: true } };
  },

  async team_list(client) {
    const r = await listTeams(client);
    if (!r.success) {
      return { success: false, data: {}, error: r.error };
    }
    return { success: true, data: { teams: r.teams } };
  },
};

registerHandler({
  connectorType: "linear",
  supportedActions: Object.keys(actions),
  async execute(actionId, params, credentials, connectorId) {
    const handler = actions[actionId];
    if (!handler) {
      return {
        success: false,
        data: {},
        error: `Unsupported Linear action: ${actionId}`,
      };
    }

    const client = createLinearClient({
      connectorId,
      accessToken: credentials.accessToken,
    });

    return await handler(client, params);
  },
});
