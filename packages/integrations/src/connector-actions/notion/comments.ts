import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const commentActions: ConnectorActionDefinition[] = [
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
];
