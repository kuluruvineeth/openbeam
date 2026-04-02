import type { AtlassianClient } from "../../atlassian/client";
import { listTransitions, transitionIssue } from "../api/transitions";

export interface IssueActionResult {
  success: boolean;
  issueId?: string;
  issueKey?: string;
  url?: string;
  error?: string;
}

type CreateIssueResponse = {
  id: string;
  key: string;
  self: string;
};

export async function createIssue(
  client: AtlassianClient,
  options: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType?: string;
    priority?: string;
    assigneeId?: string;
    labels?: string[];
  }
): Promise<IssueActionResult> {
  try {
    const fields: Record<string, unknown> = {
      project: { key: options.projectKey },
      summary: options.summary,
      issuetype: { name: options.issueType ?? "Task" },
    };

    if (options.description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: options.description }],
          },
        ],
      };
    }

    if (options.priority) {
      fields.priority = { name: options.priority };
    }

    if (options.assigneeId) {
      fields.assignee = { accountId: options.assigneeId };
    }

    if (options.labels?.length) {
      fields.labels = options.labels;
    }

    const result = await client.post<CreateIssueResponse>("/rest/api/3/issue", {
      fields,
    });

    const siteUrl = `https://api.atlassian.com/ex/jira/${client.cloudId}`;

    return {
      success: true,
      issueId: result.id,
      issueKey: result.key,
      url: `${siteUrl}/browse/${result.key}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}

export async function updateIssue(
  client: AtlassianClient,
  issueIdOrKey: string,
  options: {
    summary?: string;
    description?: string;
    priority?: string;
    assigneeId?: string;
    labels?: string[];
  }
): Promise<IssueActionResult> {
  try {
    const fields: Record<string, unknown> = {};

    if (options.summary) {
      fields.summary = options.summary;
    }

    if (options.description) {
      fields.description = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: options.description }],
          },
        ],
      };
    }

    if (options.priority) {
      fields.priority = { name: options.priority };
    }

    if (options.assigneeId) {
      fields.assignee = { accountId: options.assigneeId };
    }

    if (options.labels) {
      fields.labels = options.labels;
    }

    await client.put(`/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}`, {
      fields,
    });

    return { success: true, issueKey: issueIdOrKey };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update issue",
    };
  }
}

export async function transitionIssueStatus(
  client: AtlassianClient,
  issueIdOrKey: string,
  targetStatus: string
): Promise<IssueActionResult> {
  try {
    const transitions = await listTransitions(client, issueIdOrKey);
    const match = transitions.find(
      (t) =>
        t.name.toLowerCase() === targetStatus.toLowerCase() ||
        t.to.name.toLowerCase() === targetStatus.toLowerCase()
    );

    if (!match) {
      const available = transitions.map((t) => t.name).join(", ");
      return {
        success: false,
        error: `Transition to "${targetStatus}" not available. Available: ${available}`,
      };
    }

    await transitionIssue(client, issueIdOrKey, match.id);
    return { success: true, issueKey: issueIdOrKey };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to transition issue",
    };
  }
}

export async function addWatcher(
  client: AtlassianClient,
  issueIdOrKey: string,
  watcherAccountId: string
): Promise<IssueActionResult> {
  try {
    await client.post(
      `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/watchers`,
      watcherAccountId
    );
    return { success: true, issueKey: issueIdOrKey };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add watcher",
    };
  }
}

export async function deleteIssue(
  client: AtlassianClient,
  issueIdOrKey: string
): Promise<IssueActionResult> {
  try {
    await client.del(`/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}`);
    return { success: true, issueKey: issueIdOrKey };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete issue",
    };
  }
}

export async function assignIssue(
  client: AtlassianClient,
  issueIdOrKey: string,
  assigneeAccountId: string
): Promise<IssueActionResult> {
  try {
    await client.put(
      `/rest/api/3/issue/${encodeURIComponent(issueIdOrKey)}/assignee`,
      { accountId: assigneeAccountId }
    );
    return { success: true, issueKey: issueIdOrKey };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to assign issue",
    };
  }
}
