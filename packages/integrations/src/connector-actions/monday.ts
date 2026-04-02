import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const mondayActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "monday",
  connectorName: "Monday.com",
  connectorIcon: "monday",
  actions: [
    {
      id: "board_list",
      name: "List Boards",
      description:
        "List all Monday.com boards the user has access to. Use this FIRST to get a boardId, which is needed for item_create and group_list.",
      connectorType: "monday",
      resource: "board",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "limit",
          name: "Limit",
          type: "number",
          required: false,
          description: "Maximum boards to return (default 50, max 200)",
          validation: { min: 1, max: 200 },
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Boards",
          type: "array",
          description: "Array of { id, name } board objects",
        },
      ],
    },
    {
      id: "group_list",
      name: "List Groups",
      description:
        "List groups in a Monday.com board. Requires boardId from board_list. Group IDs are needed for item_create (optional) and item_move_to_group.",
      connectorType: "monday",
      resource: "group",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "boardId",
          name: "Board ID",
          type: "string",
          required: true,
          description: "Board ID from board_list",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Groups",
          type: "array",
          description: "Array of { id, name } group objects",
        },
      ],
    },
    {
      id: "item_create",
      name: "Create Item",
      description:
        "Create a new item on a Monday.com board. Requires boardId — use board_list to discover it first. Optionally use group_list to get a groupId.",
      connectorType: "monday",
      resource: "item",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "boardId",
          name: "Board ID",
          type: "string",
          required: true,
          description: "Board ID to create item on",
        },
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Item name",
        },
        {
          id: "groupId",
          name: "Group ID",
          type: "string",
          required: false,
          description: "Group to add item to",
        },
        {
          id: "columnValues",
          name: "Column Values",
          type: "object",
          required: false,
          description: "Column values as JSON",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Item ID",
          type: "string",
          description: "Created item ID",
        },
        { id: "url", name: "URL", type: "string", description: "Item URL" },
      ],
    },
    {
      id: "item_add_update",
      name: "Add Update",
      description: "Add an update (comment) to an item",
      connectorType: "monday",
      resource: "item",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "itemId",
          name: "Item ID",
          type: "string",
          required: true,
          description: "Item ID",
        },
        {
          id: "body",
          name: "Body",
          type: "string",
          required: true,
          description: "Update body (HTML supported)",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Update ID",
          type: "string",
          description: "Created update ID",
        },
      ],
    },
    {
      id: "item_move_to_group",
      name: "Move Item to Group",
      description:
        "Move an item to a different group. Use group_list with the boardId to discover available group IDs.",
      connectorType: "monday",
      resource: "item",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "itemId",
          name: "Item ID",
          type: "string",
          required: true,
          description: "Item ID",
        },
        {
          id: "groupId",
          name: "Group ID",
          type: "string",
          required: true,
          description: "Target group ID",
        },
      ],
      outputs: [
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether move succeeded",
        },
      ],
    },
  ],
};
