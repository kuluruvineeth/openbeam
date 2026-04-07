import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const pageActions: ConnectorActionDefinition[] = [
  {
    id: "page_search",
    name: "Search Pages",
    description:
      "Search Notion pages by title. Returns up to 20 results with ID, title, and URL. Use this before page_update, page_archive, block_append, or comment_create to find the target page ID.",
    connectorType: "notion",
    resource: "page",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "query",
        name: "Query",
        type: "string",
        required: true,
        description:
          "Search query to match against page titles (e.g. 'Q4 Planning', 'Meeting Notes').",
      },
      {
        id: "limit",
        name: "Limit",
        type: "number",
        required: false,
        description: "Max pages to return (default 20, max 100).",
      },
    ],
    outputs: [
      {
        id: "pages",
        name: "Pages",
        type: "array",
        description:
          "Matching pages with id, title, url, and parent info. Use the id for page_update, block_append, or comment_create.",
      },
    ],
  },
  {
    id: "page_create",
    name: "Create Page",
    description:
      "Create a new Notion page under a parent page or database. Requires parentId — call database_list or page_search first to discover it. Returns the created page's ID and URL. Use when the user asks to create, add, or write a new Notion page.",
    connectorType: "notion",
    resource: "page",
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
          "Parent page or database UUID. Call database_list or page_search to discover this.",
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        required: true,
        description: "Page title displayed in Notion.",
      },
      {
        id: "content",
        name: "Content",
        type: "string",
        required: false,
        description:
          "Initial page content as plain text or markdown. Converted to Notion blocks.",
      },
      {
        id: "properties",
        name: "Properties",
        type: "object",
        required: false,
        description:
          "Database properties as JSON (only when parent is a database). Keys must match the database schema from database_list.",
      },
      {
        id: "icon",
        name: "Icon",
        type: "string",
        required: false,
        description:
          "Page icon — either an emoji character or an external image URL.",
      },
      {
        id: "cover",
        name: "Cover",
        type: "string",
        required: false,
        description: "Cover image URL displayed at the top of the page.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Page ID",
        type: "string",
        description:
          "Created page UUID — use for page_update, block_append, or comment_create.",
      },
      {
        id: "url",
        name: "URL",
        type: "string",
        description: "Direct URL to the page in Notion.",
      },
    ],
  },
  {
    id: "page_get",
    name: "Get Page",
    description:
      "Retrieve a Notion page's properties and metadata by ID. Returns the page title, icon, cover, properties, and parent info. Use to inspect a page before updating it.",
    connectorType: "notion",
    resource: "page",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "pageId",
        name: "Page ID",
        type: "string",
        required: true,
        description:
          "Notion page UUID. Get from page_search, page_create, or database_query results.",
      },
    ],
    outputs: [
      {
        id: "page",
        name: "Page",
        type: "object",
        description:
          "Page data including title, icon, cover, properties, parent, and timestamps.",
      },
    ],
  },
  {
    id: "page_update",
    name: "Update Page",
    description:
      "Update a Notion page's properties, icon, or cover. Requires the page UUID — use page_search to find it. Only specified fields are modified; omitted fields remain unchanged.",
    connectorType: "notion",
    resource: "page",
    category: "update",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "pageId",
        name: "Page ID",
        type: "string",
        required: true,
        description:
          "Notion page UUID to update. Get from page_search or page_create.",
      },
      {
        id: "properties",
        name: "Properties",
        type: "object",
        required: false,
        description:
          "Properties to update as JSON. Keys must match the page's property schema.",
      },
      {
        id: "icon",
        name: "Icon",
        type: "string",
        required: false,
        description: "New icon — emoji character or external image URL.",
      },
      {
        id: "cover",
        name: "Cover",
        type: "string",
        required: false,
        description: "New cover image URL.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Page ID",
        type: "string",
        description: "Updated page UUID.",
      },
    ],
  },
  {
    id: "page_archive",
    name: "Archive Page",
    description:
      "Archive (soft-delete) a Notion page. The page can be restored from Notion's trash. Use page_search to find the page ID first. Do NOT use this to permanently delete — Notion does not support permanent deletion via API.",
    connectorType: "notion",
    resource: "page",
    category: "delete",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: true,
    inputs: [
      {
        id: "pageId",
        name: "Page ID",
        type: "string",
        required: true,
        description:
          "Notion page UUID to archive. Verify with page_search or page_get first.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Page ID",
        type: "string",
        description: "Archived page UUID.",
      },
    ],
  },
];
