import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const notionActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "notion",
  connectorName: "Notion",
  connectorIcon: "notion",
  actions: [
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
      idempotent: false,
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
      idempotent: false,
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
      idempotent: false,
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
      idempotent: false,
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
          description:
            "Matching database entries with id, properties, and url.",
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
    {
      id: "block_append",
      name: "Append Block",
      description:
        "Append content blocks to a Notion page or block. Use to add text, headings, lists, code blocks, or other content to an existing page. Requires the parent block/page ID — use page_search to find it.",
      connectorType: "notion",
      resource: "block",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: true,
      idempotent: false,
      inputs: [
        {
          id: "blockId",
          name: "Block ID",
          type: "string",
          required: true,
          description:
            "Parent block or page UUID to append content to. Get from page_search or page_create.",
        },
        {
          id: "children",
          name: "Children",
          type: "array",
          required: true,
          description:
            "Array of Notion block objects to append (e.g. [{ type: 'paragraph', paragraph: { rich_text: [{ text: { content: 'Hello' } }] } }]).",
        },
      ],
      outputs: [
        {
          id: "results",
          name: "Results",
          type: "array",
          description: "Created block objects with their IDs.",
        },
      ],
    },
    {
      id: "block_delete",
      name: "Delete Block",
      description:
        "Delete a content block from a Notion page. This is irreversible. Use page_get to inspect the page structure before deleting specific blocks.",
      connectorType: "notion",
      resource: "block",
      category: "delete",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "blockId",
          name: "Block ID",
          type: "string",
          required: true,
          description: "UUID of the block to delete.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Block ID",
          type: "string",
          description: "Deleted block UUID.",
        },
      ],
    },
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
    {
      id: "comment_create",
      name: "Add Comment",
      description:
        "Add a comment to a Notion page. Requires the page UUID — use page_search to find it. Use when the user asks to comment on, annotate, or leave feedback on a page.",
      connectorType: "notion",
      resource: "comment",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "pageId",
          name: "Page ID",
          type: "string",
          required: true,
          description:
            "Notion page UUID to comment on. Get from page_search or page_create.",
        },
        {
          id: "text",
          name: "Text",
          type: "string",
          required: true,
          description: "Comment text content.",
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
  ],
};
