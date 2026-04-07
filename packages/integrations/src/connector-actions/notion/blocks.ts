import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const blockActions: ConnectorActionDefinition[] = [
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
];
