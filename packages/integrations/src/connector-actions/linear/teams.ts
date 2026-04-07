import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const teamActions: ConnectorActionDefinition[] = [
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
    idempotent: true,
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
];
