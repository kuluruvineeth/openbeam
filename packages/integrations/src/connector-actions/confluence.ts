import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const confluenceActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "confluence",
  connectorName: "Confluence",
  connectorIcon: "confluence",
  actions: [
    {
      id: "space_list",
      name: "List Spaces",
      description:
        "List all Confluence spaces accessible to the connected account. Returns each space's ID, key, name, and type. Use this FIRST before page_create to discover the required space_id. No parameters required.",
      connectorType: "confluence",
      resource: "space",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [],
      outputs: [
        {
          id: "spaces",
          name: "Spaces",
          type: "string",
          description:
            "Array of spaces with id, key (e.g. 'ENG'), name, and type (global or personal).",
        },
      ],
    },
    {
      id: "page_create",
      name: "Create Page",
      description:
        "Create a new Confluence page in a space. Requires space_id — call space_list first to discover available spaces. Returns the page ID and URL. Use when the user asks to create, write, or add a new Confluence page or document.",
      connectorType: "confluence",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "space_id",
          name: "Space ID",
          type: "string",
          required: true,
          description:
            "Confluence space ID. Call space_list to discover available space IDs.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description: "Page title. Must be unique within the space.",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: true,
          description:
            "Page content in Confluence XHTML storage format or plain text. HTML tags like <p>, <h1>, <ul>, <table> are supported.",
        },
        {
          id: "parent_id",
          name: "Parent Page ID",
          type: "string",
          required: false,
          description:
            "Parent page ID for nesting. Omit to create at the space root. Use search_documents to find parent page IDs.",
        },
      ],
      outputs: [
        {
          id: "pageId",
          name: "Page ID",
          type: "string",
          description:
            "Created page ID — use for page_update, comment_add, or page_archive.",
        },
        {
          id: "url",
          name: "Page URL",
          type: "string",
          description: "Direct URL to the page in Confluence.",
        },
      ],
    },
    {
      id: "page_update",
      name: "Update Page",
      description:
        "Update the title and body of an existing Confluence page. Requires the page_id — use search_documents to find it. Creates a new version in the page's history. Both title and body must be provided (Confluence requires both for updates).",
      connectorType: "confluence",
      resource: "page",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "page_id",
          name: "Page ID",
          type: "string",
          required: true,
          description:
            "Confluence page ID to update. Get from page_create output or search_documents results.",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description:
            "Page title — must be provided even if unchanged (Confluence API requirement).",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: true,
          description:
            "Updated page content in XHTML storage format. Replaces the entire body.",
        },
        {
          id: "version_message",
          name: "Version Message",
          type: "string",
          required: false,
          description:
            "Change description for version history (e.g. 'Updated Q4 numbers', 'Fixed formatting').",
        },
      ],
      outputs: [
        {
          id: "pageId",
          name: "Page ID",
          type: "string",
          description: "Updated page ID.",
        },
        {
          id: "url",
          name: "Page URL",
          type: "string",
          description: "Direct URL to the updated page.",
        },
      ],
    },
    {
      id: "comment_add",
      name: "Add Comment",
      description:
        "Add a comment to a Confluence page. Requires the page_id — use search_documents to find it. Use when the user asks to comment on, discuss, or leave feedback on a Confluence page.",
      connectorType: "confluence",
      resource: "comment",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "page_id",
          name: "Page ID",
          type: "string",
          required: true,
          description:
            "Confluence page ID to comment on. Get from page_create or search_documents.",
        },
        {
          id: "body",
          name: "Comment Body",
          type: "string",
          required: true,
          description:
            "Comment text. Supports Confluence XHTML storage format (e.g. '<p>Looks good!</p>').",
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
      id: "page_archive",
      name: "Archive Page",
      description:
        "Archive a Confluence page, removing it from the space's active page tree. Archived pages can be restored by a space admin. Use search_documents to find the page ID first. Do NOT use this for deleting — Confluence archive is non-destructive.",
      connectorType: "confluence",
      resource: "page",
      category: "update",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "page_id",
          name: "Page ID",
          type: "string",
          required: true,
          description:
            "Confluence page ID to archive. Verify with search_documents first.",
        },
      ],
      outputs: [
        {
          id: "pageId",
          name: "Page ID",
          type: "string",
          description: "Archived page ID.",
        },
      ],
    },
  ],
};
