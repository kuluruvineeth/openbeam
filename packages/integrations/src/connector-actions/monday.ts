import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const mondayActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "monday",
  connectorName: "Monday.com",
  connectorIcon: "monday",
  actions: [
    {
      id: "board_list",
      name: "List Boards",
      description:
        "List all Monday.com boards the user has access to. Returns board IDs and names. Use this FIRST to discover a boardId, which is required for item_create, group_list, and item_add_update. No parameters required.",
      connectorType: "monday",
      resource: "board",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "limit",
          name: "Limit",
          type: "number",
          required: false,
          description: "Max boards to return (default 50, max 200).",
          validation: { min: 1, max: 200 },
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Boards",
          type: "array",
          description:
            "Array of { id, name } board objects. Use the id for item_create, group_list, and item_add_update.",
        },
      ],
    },
    {
      id: "group_list",
      name: "List Groups",
      description:
        "List all groups (sections) in a Monday.com board. Requires boardId — call board_list first. Returns group IDs and names. Use this to discover group IDs for item_create (optional) or item_move_to_group.",
      connectorType: "monday",
      resource: "group",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "boardId",
          name: "Board ID",
          type: "string",
          required: true,
          description:
            "Monday.com board ID. Call board_list to discover available board IDs.",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Groups",
          type: "array",
          description:
            "Array of { id, name } group objects. Use the id for item_create or item_move_to_group.",
        },
      ],
    },
    {
      id: "item_create",
      name: "Create Item",
      description:
        "Create a new item (row) on a Monday.com board. Requires boardId — call board_list first. Optionally place in a specific group by providing groupId — call group_list to discover it. Returns the item ID and URL. Use when the user asks to create, add, or file a new item.",
      connectorType: "monday",
      resource: "item",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "boardId",
          name: "Board ID",
          type: "string",
          required: true,
          description:
            "Board ID to create the item on. Call board_list to discover this.",
        },
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Item name displayed in the first column.",
        },
        {
          id: "groupId",
          name: "Group ID",
          type: "string",
          required: false,
          description:
            "Group (section) to place the item in. Call group_list to discover group IDs. Omit for the default group.",
        },
        {
          id: "columnValues",
          name: "Column Values",
          type: "object",
          required: false,
          description:
            "Column values as JSON object. Keys are column IDs, values follow Monday.com's column value format (e.g. { 'status': { 'label': 'Done' }, 'date': { 'date': '2026-04-15' } }).",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Item ID",
          type: "string",
          description:
            "Created item ID — use for item_add_update or item_move_to_group.",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the item in Monday.com.",
        },
      ],
    },
    {
      id: "item_add_update",
      name: "Add Update",
      description:
        "Add an update (comment/note) to a Monday.com item. Requires the item ID — use search_documents or a previous item_create result to get it. Use when the user asks to comment on, update, or add a note to an item.",
      connectorType: "monday",
      resource: "item",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "itemId",
          name: "Item ID",
          type: "string",
          required: true,
          description:
            "Monday.com item ID. Get from item_create output or search_documents.",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: true,
          description:
            "Update body. Supports HTML formatting (e.g. '<b>bold</b>', '<ul><li>item</li></ul>').",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Update ID",
          type: "string",
          description: "Created update ID.",
        },
      ],
    },
    {
      id: "item_move_to_group",
      name: "Move Item to Group",
      description:
        "Move an item to a different group (section) within the same Monday.com board. Requires the item ID and target group ID. Call group_list with the board ID to discover available group IDs.",
      connectorType: "monday",
      resource: "item",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "itemId",
          name: "Item ID",
          type: "string",
          required: true,
          description:
            "Item ID to move. Get from item_create or search_documents.",
        },
        {
          id: "groupId",
          name: "Group ID",
          type: "string",
          required: true,
          description:
            "Target group ID to move the item to. Call group_list with the board ID to discover groups.",
        },
      ],
      outputs: [
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the move succeeded.",
        },
      ],
    },
  ],
};
