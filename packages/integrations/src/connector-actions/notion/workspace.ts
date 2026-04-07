import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const workspaceActions: ConnectorActionDefinition[] = [
  {
    id: "search",
    name: "Search",
    description:
      "Search across the entire Notion workspace for pages and databases matching a query. Returns up to 100 results with ID, title, and type. Use this for broad searches; use page_search for title-specific page lookups or database_query for structured data lookups.",
    connectorType: "notion",
    resource: "workspace",
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
          "Search query matching against page/database titles and content.",
      },
      {
        id: "filter",
        name: "Filter",
        type: "object",
        required: false,
        description:
          "Filter by object type (e.g. { value: 'page', property: 'object' } or { value: 'database', property: 'object' }).",
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
        description:
          "Matching pages and databases with id, title, type, and url.",
      },
      {
        id: "hasMore",
        name: "Has More",
        type: "boolean",
        description: "Whether more results are available.",
      },
    ],
  },
];
