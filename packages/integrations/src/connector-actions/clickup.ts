import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const clickUpActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "clickup",
  connectorName: "ClickUp",
  connectorIcon: "clickup",
  actions: [
    {
      id: "workspace_list",
      name: "List Workspaces",
      description:
        "List all ClickUp workspaces (teams) the user has access to. Returns workspace IDs and names. Use this FIRST to get a teamId, which is required for space_list. No parameters required.",
      connectorType: "clickup",
      resource: "workspace",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [],
      outputs: [
        {
          id: "items",
          name: "Workspaces",
          type: "array",
          description:
            "Array of { id, name } workspace objects. Use the id for space_list.",
        },
      ],
    },
    {
      id: "space_list",
      name: "List Spaces",
      description:
        "List all spaces in a ClickUp workspace. Requires teamId — call workspace_list first. Returns space IDs and names. Use this to get a spaceId for folder_list or list_list.",
      connectorType: "clickup",
      resource: "space",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "teamId",
          name: "Team ID",
          type: "string",
          required: true,
          description:
            "ClickUp workspace (team) ID. Call workspace_list to discover this.",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Spaces",
          type: "array",
          description:
            "Array of { id, name } space objects. Use the id for folder_list or list_list.",
        },
      ],
    },
    {
      id: "folder_list",
      name: "List Folders",
      description:
        "List folders in a ClickUp space. Requires spaceId — call space_list first. Folders contain lists, which contain tasks. Use list_list with a folderId to see lists inside a folder.",
      connectorType: "clickup",
      resource: "folder",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "spaceId",
          name: "Space ID",
          type: "string",
          required: true,
          description: "ClickUp space ID. Call space_list to discover this.",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Folders",
          type: "array",
          description:
            "Array of { id, name } folder objects. Use the id with list_list to see lists inside.",
        },
      ],
    },
    {
      id: "list_list",
      name: "List Lists",
      description:
        "List all lists in a ClickUp space or folder. Provide either spaceId (for folderless lists) or folderId (for lists inside a folder). The returned list IDs are required for task_create. Discovery chain: workspace_list -> space_list -> list_list (or folder_list -> list_list).",
      connectorType: "clickup",
      resource: "list",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "spaceId",
          name: "Space ID",
          type: "string",
          required: false,
          description:
            "Space ID for folderless lists. Get from space_list. Provide this OR folderId.",
        },
        {
          id: "folderId",
          name: "Folder ID",
          type: "string",
          required: false,
          description:
            "Folder ID for lists inside a folder. Get from folder_list. Provide this OR spaceId.",
        },
      ],
      outputs: [
        {
          id: "items",
          name: "Lists",
          type: "array",
          description:
            "Array of { id, name } list objects. Use the id for task_create.",
        },
      ],
    },
    {
      id: "task_create",
      name: "Create Task",
      description:
        "Create a new ClickUp task in a list. Requires listId — use the discovery chain workspace_list -> space_list -> list_list (or folder_list -> list_list) to find it. Returns the task ID and URL. Use when the user asks to create, add, or file a new task.",
      connectorType: "clickup",
      resource: "task",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "listId",
          name: "List ID",
          type: "string",
          required: true,
          description:
            "ClickUp list ID to create the task in. Get from list_list.",
        },
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Task name/title.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description: "Task description. Supports markdown formatting.",
        },
        {
          id: "priority",
          name: "Priority",
          type: "number",
          required: false,
          description:
            "Priority level: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low. Omit for no priority.",
        },
        {
          id: "dueDate",
          name: "Due Date",
          type: "number",
          required: false,
          description:
            "Due date as Unix millisecond timestamp (e.g. 1714694400000 for 2026-05-03). Omit for no deadline.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Task ID",
          type: "string",
          description:
            "Created task ID — use for task_update or task_add_comment.",
        },
        {
          id: "url",
          name: "URL",
          type: "string",
          description: "Direct URL to the task in ClickUp.",
        },
      ],
    },
    {
      id: "task_update",
      name: "Update Task",
      description:
        "Update an existing ClickUp task. Requires the task ID — use search_documents or a previous task_create result to get it. Only specified fields are modified; omitted fields remain unchanged.",
      connectorType: "clickup",
      resource: "task",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "taskId",
          name: "Task ID",
          type: "string",
          required: true,
          description:
            "ClickUp task ID to update. Get from task_create output or search_documents.",
        },
        {
          id: "name",
          name: "Name",
          type: "string",
          required: false,
          description: "New task name. Omit to keep current.",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
          description: "New task description.",
        },
        {
          id: "status",
          name: "Status",
          type: "string",
          required: false,
          description:
            "New status name (e.g. 'open', 'in progress', 'complete'). Must match a status in the task's list.",
        },
        {
          id: "priority",
          name: "Priority",
          type: "number",
          required: false,
          description:
            "New priority: 1 = Urgent, 2 = High, 3 = Normal, 4 = Low.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Task ID",
          type: "string",
          description: "Updated task ID.",
        },
        {
          id: "success",
          name: "Success",
          type: "boolean",
          description: "Whether the update succeeded.",
        },
      ],
    },
    {
      id: "task_add_comment",
      name: "Add Comment",
      description:
        "Add a comment to a ClickUp task. Requires the task ID — use search_documents or task_create to find it. Use when the user asks to comment on, note, or update a task with information.",
      connectorType: "clickup",
      resource: "task",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "taskId",
          name: "Task ID",
          type: "string",
          required: true,
          description:
            "ClickUp task ID to comment on. Get from task_create or search_documents.",
        },
        {
          id: "commentText",
          name: "Comment Text",
          type: "string",
          required: true,
          description: "Comment body as plain text.",
        },
      ],
      outputs: [
        {
          id: "id",
          name: "Comment ID",
          type: "string",
          description: "Created comment ID.",
        },
      ],
    },
  ],
};
