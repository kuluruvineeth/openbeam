import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const asanaActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "asana",
  connectorName: "Asana",
  connectorIcon: "asana",
  actions: [
    {
      id: "workspace_list",
      name: "List Workspaces",
      description:
        "List all Asana workspaces accessible to the connected account. Returns each workspace's GID and name. Use this FIRST to discover workspace GIDs before calling project_list or task_create. No parameters required.",
      connectorType: "asana",
      resource: "workspace",
      category: "list",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [],
      outputs: [
        {
          id: "workspaces",
          name: "Workspaces",
          type: "object",
          description:
            "Array of workspaces with gid and name. Use the gid for project_list and task_create.",
        },
      ],
    },
    {
      id: "project_list",
      name: "List Projects",
      description:
        "List all projects in an Asana workspace. Requires workspace_gid — call workspace_list first. Returns project GIDs and names. Use this before task_create to discover the project_gid parameter.",
      connectorType: "asana",
      resource: "project",
      category: "list",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "workspace_gid",
          name: "Workspace GID",
          type: "string",
          required: true,
          description:
            "Asana workspace GID (e.g. '1234567890'). Call workspace_list to discover available workspace GIDs.",
        },
      ],
      outputs: [
        {
          id: "projects",
          name: "Projects",
          type: "object",
          description:
            "Array of projects with gid, name, and archived status. Use the gid for task_create.",
        },
      ],
    },
    {
      id: "task_create",
      name: "Create Task",
      description:
        "Create a new Asana task in a workspace. Requires workspace_gid — call workspace_list first. Optionally assign to a project by providing project_gid — call project_list to discover it. Returns the task GID and URL. Use when the user asks to create, add, or assign a new task.",
      connectorType: "asana",
      resource: "task",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "workspace_gid",
          name: "Workspace GID",
          type: "string",
          required: true,
          description:
            "Asana workspace GID. Call workspace_list to discover this.",
        },
        {
          id: "name",
          name: "Task Name",
          type: "string",
          required: true,
          description: "Name/title of the task.",
        },
        {
          id: "notes",
          name: "Notes",
          type: "string",
          required: false,
          description:
            "Task description/notes. Supports plain text (use HTML_notes for rich text).",
        },
        {
          id: "project_gid",
          name: "Project GID",
          type: "string",
          required: false,
          description:
            "Project GID to add the task to. Call project_list to discover project GIDs.",
        },
        {
          id: "assignee_gid",
          name: "Assignee GID",
          type: "string",
          required: false,
          description:
            "Asana user GID to assign the task to. Use search_people to find user GIDs.",
        },
        {
          id: "due_on",
          name: "Due Date",
          type: "string",
          required: false,
          description:
            "Due date in YYYY-MM-DD format (e.g. '2026-04-15'). Sets a date-only deadline.",
        },
      ],
      outputs: [
        {
          id: "taskGid",
          name: "Task GID",
          type: "string",
          description:
            "Created task GID — use for task_update, task_complete, or comment_add.",
        },
        {
          id: "url",
          name: "Task URL",
          type: "string",
          description: "Direct URL to the task in Asana.",
        },
      ],
    },
    {
      id: "task_update",
      name: "Update Task",
      description:
        "Update fields on an existing Asana task. Requires the task GID — use search_documents or a previous task_create result to get it. Only specified fields are modified; omitted fields remain unchanged.",
      connectorType: "asana",
      resource: "task",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "task_gid",
          name: "Task GID",
          type: "string",
          required: true,
          description:
            "Asana task GID to update. Get from task_create output or search_documents results.",
        },
        {
          id: "name",
          name: "Task Name",
          type: "string",
          required: false,
          description: "New task name. Omit to keep current.",
        },
        {
          id: "notes",
          name: "Notes",
          type: "string",
          required: false,
          description: "New task notes/description.",
        },
        {
          id: "assignee_gid",
          name: "Assignee GID",
          type: "string",
          required: false,
          description:
            "New assignee user GID. Use search_people to find user GIDs.",
        },
        {
          id: "due_on",
          name: "Due Date",
          type: "string",
          required: false,
          description: "New due date in YYYY-MM-DD format (e.g. '2026-04-30').",
        },
      ],
      outputs: [
        {
          id: "taskGid",
          name: "Task GID",
          type: "string",
          description: "Updated task GID.",
        },
      ],
    },
    {
      id: "task_complete",
      name: "Complete Task",
      description:
        "Mark an Asana task as complete. Requires the task GID — use search_documents or task_create to find it. This is reversible (tasks can be uncompleted in Asana). Use when the user asks to complete, finish, close, or mark a task as done.",
      connectorType: "asana",
      resource: "task",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        {
          id: "task_gid",
          name: "Task GID",
          type: "string",
          required: true,
          description:
            "Asana task GID to mark complete. Get from task_create or search_documents.",
        },
      ],
      outputs: [
        {
          id: "taskGid",
          name: "Task GID",
          type: "string",
          description: "Completed task GID.",
        },
      ],
    },
    {
      id: "comment_add",
      name: "Add Comment",
      description:
        "Add a comment (story) to an Asana task. Requires the task GID — use search_documents or task_create to find it. Use when the user asks to comment on, note, or update a task with information.",
      connectorType: "asana",
      resource: "comment",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "task_gid",
          name: "Task GID",
          type: "string",
          required: true,
          description:
            "Asana task GID to comment on. Get from task_create or search_documents.",
        },
        {
          id: "text",
          name: "Comment Text",
          type: "string",
          required: true,
          description:
            "Comment body as plain text. Appears as a story on the task.",
        },
      ],
      outputs: [
        {
          id: "storyGid",
          name: "Story GID",
          type: "string",
          description: "Created story (comment) GID.",
        },
      ],
    },
  ],
};
