import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const jiraActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "jira",
  connectorName: "Jira",
  connectorIcon: "jira",
  actions: [
    {
      id: "issue_create",
      name: "Create Issue",
      description:
        "Create a new Jira issue in a project. Requires project_key — use issue_search with JQL 'project = X' to discover projects, or ask the user. Returns the issue key (e.g. ENG-456) and URL. Use when the user asks to create, file, or open a Jira ticket.",
      connectorType: "jira",
      resource: "issue",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "project_key",
          name: "Project Key",
          type: "string",
          required: true,
          description:
            "Jira project key — the uppercase prefix on issue keys (e.g. 'ENG', 'PLATFORM', 'OPS').",
        },
        {
          id: "summary",
          name: "Summary",
          type: "string",
          required: true,
          description: "Issue title/summary — concise description of the work.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description:
            "Issue description. Accepts plain text or Atlassian Document Format (ADF) JSON.",
        },
        {
          id: "issue_type",
          name: "Issue Type",
          type: "string",
          required: false,
          description:
            "Issue type name: 'Task' (default), 'Bug', 'Story', or 'Epic'. Must match an existing type in the project.",
          default: "Task",
        },
        {
          id: "priority",
          name: "Priority",
          type: "string",
          required: false,
          description:
            "Priority name: 'Highest', 'High', 'Medium', 'Low', or 'Lowest'. Defaults to project default.",
        },
        {
          id: "assignee_id",
          name: "Assignee Account ID",
          type: "string",
          required: false,
          description:
            "Atlassian account ID of the assignee. Use search_people to find account IDs.",
        },
        {
          id: "labels",
          name: "Labels",
          type: "array",
          required: false,
          description:
            "Array of label strings to apply (e.g. ['backend', 'security']). Labels are created automatically if they don't exist.",
        },
      ],
      outputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          description: "Internal Jira issue ID.",
        },
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description:
            "Human-readable issue key (e.g. 'ENG-456') — use for issue_update, issue_transition, comment_add.",
        },
        {
          id: "url",
          name: "Issue URL",
          type: "string",
          description: "Direct URL to the issue in Jira.",
        },
      ],
    },
    {
      id: "issue_update",
      name: "Update Issue",
      description:
        "Update fields on an existing Jira issue. Requires the issue key (e.g. ENG-123) — use issue_search to find it. Only specified fields are modified; omitted fields remain unchanged.",
      connectorType: "jira",
      resource: "issue",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description:
            "Jira issue key (e.g. 'ENG-123'). Get from issue_create output or issue_search results.",
        },
        {
          id: "summary",
          name: "Summary",
          type: "string",
          required: false,
          description: "New issue title. Omit to keep current.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description:
            "New description. Replaces the entire description field.",
        },
        {
          id: "priority",
          name: "Priority",
          type: "string",
          required: false,
          description:
            "New priority name: 'Highest', 'High', 'Medium', 'Low', or 'Lowest'.",
        },
        {
          id: "labels",
          name: "Labels",
          type: "array",
          required: false,
          description:
            "New label array. Replaces all existing labels on the issue.",
        },
      ],
      outputs: [
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description: "Updated issue key.",
        },
      ],
    },
    {
      id: "issue_transition",
      name: "Transition Issue",
      description:
        "Change the workflow status of a Jira issue (e.g. move from 'To Do' to 'In Progress' or 'Done'). Requires the issue key and target status name. Use when the user asks to move, transition, close, or reopen an issue.",
      connectorType: "jira",
      resource: "issue",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description:
            "Jira issue key (e.g. 'ENG-123'). Get from issue_search.",
        },
        {
          id: "target_status",
          name: "Target Status",
          type: "string",
          required: true,
          description:
            "Status name to transition to (e.g. 'In Progress', 'Done', 'To Do', 'In Review'). Must be a valid transition from the current status.",
        },
      ],
      outputs: [
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description: "Transitioned issue key.",
        },
      ],
    },
    {
      id: "issue_assign",
      name: "Assign Issue",
      description:
        "Assign a Jira issue to a user. Requires the issue key and Atlassian account ID. Use issue_search to find the issue and search_people to find the user. Use when the user asks to assign, delegate, or reassign a ticket.",
      connectorType: "jira",
      resource: "issue",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description: "Jira issue key (e.g. 'ENG-123').",
        },
        {
          id: "assignee_id",
          name: "Assignee Account ID",
          type: "string",
          required: true,
          description:
            "Atlassian account ID of the user to assign. Use search_people to find account IDs by name or email.",
        },
      ],
      outputs: [
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description: "Assigned issue key.",
        },
      ],
    },
    {
      id: "comment_add",
      name: "Add Comment",
      description:
        "Add a comment to a Jira issue. Requires the issue key — use issue_search to find it. Use when the user asks to comment on, note, or update a ticket with information.",
      connectorType: "jira",
      resource: "comment",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description: "Jira issue key (e.g. 'ENG-123').",
        },
        {
          id: "body",
          name: "Comment Body",
          type: "string",
          required: true,
          description:
            "Comment text. Accepts plain text or Atlassian Document Format (ADF) JSON.",
        },
      ],
      outputs: [
        {
          id: "commentId",
          name: "Comment ID",
          type: "string",
          description: "Created comment ID.",
        },
      ],
    },
    {
      id: "issue_add_watcher",
      name: "Add Watcher",
      description:
        "Add a user as a watcher on a Jira issue so they receive notifications. Requires the issue key and user's Atlassian account ID. Use search_people to find account IDs.",
      connectorType: "jira",
      resource: "issue",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description: "Jira issue key (e.g. 'ENG-123').",
        },
        {
          id: "watcher_account_id",
          name: "Watcher Account ID",
          type: "string",
          required: true,
          description:
            "Atlassian account ID of the user to add as watcher. Use search_people to find IDs.",
        },
      ],
      outputs: [
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description: "Issue key the watcher was added to.",
        },
      ],
    },
    {
      id: "issue_delete",
      name: "Delete Issue",
      description:
        "Permanently delete a Jira issue. This action is irreversible and requires admin permissions. Use issue_search to verify the correct issue before deleting. Do NOT use this for closing issues — use issue_transition instead.",
      connectorType: "jira",
      resource: "issue",
      category: "delete",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "issue_key",
          name: "Issue Key",
          type: "string",
          required: true,
          description:
            "Jira issue key to permanently delete (e.g. 'ENG-123'). Verify with issue_search first.",
        },
      ],
      outputs: [
        {
          id: "issueKey",
          name: "Issue Key",
          type: "string",
          description: "Deleted issue key.",
        },
      ],
    },
    {
      id: "issue_search",
      name: "Search Issues",
      description:
        "Search Jira issues using JQL (Jira Query Language). Returns up to 20 results with issue key, summary, status, and assignee. Use this to find issues before updating, commenting, transitioning, or deleting them.",
      connectorType: "jira",
      resource: "issue",
      category: "search",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "jql",
          name: "JQL Query",
          type: "string",
          required: true,
          description:
            "JQL search query (e.g. 'project = ENG AND status = \"In Progress\"', 'assignee = currentUser() AND sprint in openSprints()', 'text ~ \"login bug\"').",
        },
        {
          id: "max_results",
          name: "Max Results",
          type: "number",
          required: false,
          description: "Max results to return (default 20, max 100).",
          default: 20,
        },
      ],
      outputs: [
        {
          id: "issues",
          name: "Issues",
          type: "array",
          description:
            "Matching issues with key, summary, status, assignee, and priority.",
        },
        {
          id: "total",
          name: "Total Count",
          type: "number",
          description: "Total number of matching issues.",
        },
      ],
    },
  ],
};
