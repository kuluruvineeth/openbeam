import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const projectActions: ConnectorActionDefinition[] = [
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
    idempotent: true,
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
        description: "Target completion date in ISO 8601 format (YYYY-MM-DD).",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Project ID",
        type: "string",
        description: "Created project UUID — use as projectId in issue_create.",
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        description: "Direct URL to the project in Linear.",
      },
    ],
  },
];
