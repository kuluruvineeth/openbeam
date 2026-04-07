import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const cycleActions: ConnectorActionDefinition[] = [
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
];
