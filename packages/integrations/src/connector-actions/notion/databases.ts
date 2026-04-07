import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const databaseActions: ConnectorActionDefinition[] = [
  {
    id: "database_list",
    name: "List Databases",
    description:
      "List all Notion databases accessible to the connected account. Returns each database's ID, title, and URL. Use this FIRST before database_query, database_create, or page_create (with a database parent) to discover database IDs. No parameters required.",
    connectorType: "notion",
    resource: "database",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "limit",
        name: "Limit",
        type: "number",
        required: false,
        description: "Max databases to return (default 50, max 100).",
      },
    ],
    outputs: [
      {
        id: "databases",
        name: "Databases",
        type: "array",
        description:
          "Array of databases with id, title, url, and property schema.",
      },
    ],
  },
  {
    id: "database_query",
    name: "Query Database",
    description:
      "Query a Notion database with optional filters and sorts. Requires databaseId — call database_list first. Returns matching pages/entries from the database. Use when the user asks to look up, filter, or list items in a Notion database.",
    connectorType: "notion",
    resource: "database",
    category: "search",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "databaseId",
        name: "Database ID",
        type: "string",
        required: true,
        description:
          "Notion database UUID. Call database_list to discover available databases.",
      },
      {
        id: "filter",
        name: "Filter",
        type: "object",
        required: false,
        description:
          "Notion filter object (e.g. { property: 'Status', status: { equals: 'Done' } }).",
      },
      {
        id: "sorts",
        name: "Sorts",
        type: "array",
        required: false,
        description:
          "Sort conditions array (e.g. [{ property: 'Created', direction: 'descending' }]).",
      },
      {
        id: "pageSize",
        name: "Page Size",
        type: "number",
        required: false,
        description: "Results per page (default 50, max 100).",
      },
    ],
    outputs: [
      {
        id: "results",
        name: "Results",
        type: "array",
        description: "Matching database entries with id, properties, and url.",
      },
      {
        id: "hasMore",
        name: "Has More",
        type: "boolean",
        description: "Whether more results are available for pagination.",
      },
    ],
  },
  {
    id: "database_create",
    name: "Create Database",
    description:
      "Create a new inline Notion database on a parent page. Requires parentId — call page_search to find a parent page. Returns the database ID and URL. Use when the user asks to create a table, tracker, or structured database.",
    connectorType: "notion",
    resource: "database",
    category: "create",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "parentId",
        name: "Parent ID",
        type: "string",
        required: true,
        description:
          "Parent page UUID where the database will be created. Call page_search to find it.",
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        required: true,
        description: "Database title displayed in Notion.",
      },
      {
        id: "properties",
        name: "Properties",
        type: "object",
        required: false,
        description:
          "Database schema as JSON defining columns. Keys are property names, values define the type (e.g. { 'Status': { select: { options: [...] } } }).",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Database ID",
        type: "string",
        description:
          "Created database UUID — use for database_query or as parentId in page_create.",
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        description: "Direct URL to the database in Notion.",
      },
    ],
  },
];
