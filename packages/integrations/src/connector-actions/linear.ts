import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const linearActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "linear",
  connectorName: "Linear",
  connectorIcon: "linear",
  actions: [
    {
      id: "issue_create",
      name: "Create Issue",
      description:
        "Create a new Linear issue. Requires teamId — call team_list first to discover available team IDs. Returns the created issue's ID, identifier (e.g. ENG-123), and URL. Use when the user asks to create, file, or open a new issue or ticket.",
      connectorType: "linear",
      resource: "issue",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description: "Issue title — concise summary of the work.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description:
            "Issue description in markdown format. Supports full markdown including headings, lists, and code blocks.",
        },
        {
          id: "teamId",
          name: "Team ID",
          type: "string",
          required: true,
          description:
            "The Linear team UUID. Call team_list to discover available team IDs.",
        },
        {
          id: "assigneeId",
          name: "Assignee ID",
          type: "string",
          required: false,
          description:
            "Linear user UUID to assign. Use issue_search or search_people to find user IDs.",
        },
        {
          id: "priority",
          name: "Priority",
          type: "number",
          required: false,
          description:
            "Priority level: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.",
        },
        {
          id: "stateId",
          name: "State ID",
          type: "string",
          required: false,
          description:
            "Workflow state UUID (e.g. Backlog, Todo, In Progress, Done). Omit to use team default.",
        },
        {
          id: "labelIds",
          name: "Label IDs",
          type: "array",
          required: false,
          description:
            "Array of label UUIDs to apply (e.g. ['bug', 'frontend']).",
        },
        {
          id: "projectId",
          name: "Project ID",
          type: "string",
          required: false,
          description:
            "Project UUID to associate with. Use project_get or issue_search to discover project IDs.",
        },
        {
          id: "cycleId",
          name: "Cycle ID",
          type: "string",
          required: false,
          description:
            "Cycle UUID to add the issue to. Use cycle_get to look up active cycles.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Issue ID",
          type: "string",
          description:
            "Created issue UUID — use this for issue_update, issue_assign, or issue_add_comment.",
        },
        {
          id: "identifier",
          name: "Identifier",
          type: "string",
          description:
            "Human-readable identifier (e.g. ENG-123) for referencing in conversations.",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the issue in Linear.",
        },
      ],
    },
    {
      id: "issue_update",
      name: "Update Issue",
      description:
        "Update an existing Linear issue. Requires the issue UUID — use issue_search or a previous issue_create result to get it. Only specified fields are modified; omitted fields remain unchanged.",
      connectorType: "linear",
      resource: "issue",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          required: true,
          description:
            "Linear issue UUID to update. Get from issue_create output or issue_search results.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: false,
          description: "New title. Omit to keep current title.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description:
            "New description in markdown. Replaces the entire description.",
        },
        {
          id: "assigneeId",
          name: "Assignee ID",
          type: "string",
          required: false,
          description:
            "New assignee user UUID. Use issue_assign for a simpler assignment flow.",
        },
        {
          id: "priority",
          name: "Priority",
          type: "number",
          required: false,
          description:
            "New priority: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low.",
        },
        {
          id: "stateId",
          name: "State ID",
          type: "string",
          required: false,
          description:
            "New workflow state UUID (e.g. move to 'In Progress' or 'Done').",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Issue ID",
          type: "string",
          description: "Updated issue UUID.",
        },
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the update succeeded.",
        },
      ],
    },
    {
      id: "issue_search",
      name: "Search Issues",
      description:
        "Search for Linear issues matching a query string. Returns up to 50 results with ID, identifier, title, state, and URL. Use this to find an issue before updating, commenting, or referencing it.",
      connectorType: "linear",
      resource: "issue",
      category: "search",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "query",
          name: "Query",
          type: "string",
          required: true,
          description:
            "Search query — matches against issue title, description, and identifier (e.g. 'login bug' or 'ENG-123').",
        },
        {
          id: "teamId",
          name: "Team ID",
          type: "string",
          required: false,
          description:
            "Filter results to a specific team UUID. Call team_list to discover team IDs.",
        },
        {
          id: "first",
          name: "Limit",
          type: "number",
          required: false,
          description: "Max results to return (default 20, max 50).",
        },
      ],
      outputs: [
        {
          id: "issues",
          name: "Issues",
          type: "array",
          description:
            "Matching issues with id, identifier, title, state, and url.",
        },
        {
          id: "totalCount",
          name: "Total Count",
          type: "number",
          description: "Total number of matching issues.",
        },
      ],
    },
    {
      id: "issue_assign",
      name: "Assign Issue",
      description:
        "Assign a Linear issue to a user. Requires the issue UUID and assignee UUID. Use issue_search to find the issue and search_people to find the user. Use when the user asks to assign, delegate, or hand off an issue.",
      connectorType: "linear",
      resource: "issue",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          required: true,
          description:
            "Linear issue UUID to assign. Get from issue_search or issue_create.",
        },
        {
          id: "assigneeId",
          name: "Assignee ID",
          type: "string",
          required: true,
          description:
            "Linear user UUID to assign the issue to. Use search_people to find user IDs.",
        },
      ],
      outputs: [
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the assignment succeeded.",
        },
      ],
    },
    {
      id: "issue_add_comment",
      name: "Add Comment",
      description:
        "Add a comment to a Linear issue. Requires the issue UUID — use issue_search or issue_create to get it. Use when the user asks to comment on, note, or add context to an issue.",
      connectorType: "linear",
      resource: "issue",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          required: true,
          description:
            "Linear issue UUID to comment on. Get from issue_search or issue_create.",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: true,
          description:
            "Comment body in markdown format. Supports full markdown syntax.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Comment ID",
          type: "string",
          description: "Created comment UUID.",
        },
      ],
    },
    {
      id: "issue_add_label",
      name: "Add Label",
      description:
        "Add a label to a Linear issue. Requires the issue UUID and label UUID. Use issue_search to find the issue. Use when the user asks to tag, label, or categorize an issue.",
      connectorType: "linear",
      resource: "issue",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          required: true,
          description: "Linear issue UUID to add the label to.",
        },
        {
          id: "labelId",
          name: "Label ID",
          type: "string",
          required: true,
          description:
            "Label UUID to add. Labels are workspace-scoped in Linear.",
        },
      ],
      outputs: [
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the label was added.",
        },
      ],
    },
    {
      id: "project_get",
      name: "Get Project",
      description:
        "Retrieve details for a Linear project by ID. Returns project name, description, status, and member info. Use this to look up project context before creating issues in a project.",
      connectorType: "linear",
      resource: "project",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "projectId",
          name: "Project ID",
          type: "string",
          required: true,
          description:
            "Linear project UUID. Get from issue_search results or issue_create output.",
        },
      ],
      outputs: [
        {
          id: "project",
          name: "Project",
          type: "object",
          description:
            "Project details including name, description, state, targetDate, and teams.",
        },
      ],
    },
    {
      id: "project_create",
      name: "Create Project",
      description:
        "Create a new Linear project. Requires at least one team ID — call team_list first. Returns the project ID and URL. Use when the user asks to start, create, or set up a new project.",
      connectorType: "linear",
      resource: "project",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Project name.",
        },
        {
          id: "teamIds",
          name: "Team IDs",
          type: "array",
          required: true,
          description:
            "Array of team UUIDs to associate with the project. Call team_list to discover available teams.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description: "Project description in markdown.",
        },
        {
          id: "leadId",
          name: "Lead ID",
          type: "string",
          required: false,
          description:
            "User UUID for the project lead. Use search_people to find user IDs.",
        },
        {
          id: "targetDate",
          name: "Target Date",
          type: "date",
          required: false,
          description:
            "Target completion date in ISO 8601 format (YYYY-MM-DD).",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Project ID",
          type: "string",
          description:
            "Created project UUID — use as projectId in issue_create.",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the project in Linear.",
        },
      ],
    },
    {
      id: "cycle_get",
      name: "Get Cycle",
      description:
        "Retrieve details for a Linear cycle (sprint) by ID. Returns cycle name, dates, progress, and issue counts. Use to check cycle status or find cycle IDs for issue_create.",
      connectorType: "linear",
      resource: "cycle",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "cycleId",
          name: "Cycle ID",
          type: "string",
          required: true,
          description: "Linear cycle UUID.",
        },
      ],
      outputs: [
        {
          id: "cycle",
          name: "Cycle",
          type: "object",
          description:
            "Cycle details including name, startsAt, endsAt, progress, and issue counts.",
        },
      ],
    },
    {
      id: "cycle_add_issue",
      name: "Add Issue to Cycle",
      description:
        "Add an existing issue to a Linear cycle (sprint). Requires both the issue UUID and cycle UUID. Use issue_search and cycle_get to discover the required IDs.",
      connectorType: "linear",
      resource: "cycle",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "issueId",
          name: "Issue ID",
          type: "string",
          required: true,
          description:
            "Issue UUID to add. Get from issue_search or issue_create.",
        },
        {
          id: "cycleId",
          name: "Cycle ID",
          type: "string",
          required: true,
          description: "Target cycle UUID. Get from cycle_get.",
        },
      ],
      outputs: [
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the issue was added to the cycle.",
        },
      ],
    },
    {
      id: "team_list",
      name: "List Teams",
      description:
        "List all teams in the connected Linear workspace. Returns each team's ID, name, and key. Use this FIRST before issue_create or project_create to discover the required teamId. No parameters required.",
      connectorType: "linear",
      resource: "team",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [],
      outputs: [
        {
          id: "teams",
          name: "Teams",
          type: "array",
          description:
            "Array of teams with id (UUID), name, and key (e.g. 'ENG').",
        },
      ],
    },
  ],
};
