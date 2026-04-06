import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const lessonlyActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "lessonly",
  connectorName: "Lessonly",
  connectorIcon: "lessonly",
  actions: [
    {
      id: "assignment_create",
      name: "Create Assignment",
      description: "Assign a lesson or path to a user in Lessonly",
      connectorType: "lessonly",
      resource: "assignment",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "assigneeId",
          name: "Assignee ID",
          type: "number",
          required: true,
          description: "User ID to assign to",
        },
        {
          id: "assignableId",
          name: "Assignable ID",
          type: "number",
          required: true,
          description: "Lesson or Path ID",
        },
        {
          id: "assignableType",
          name: "Assignable Type",
          type: "string",
          required: true,
          description: "Lesson or Path",
        },
        {
          id: "dueBy",
          name: "Due By",
          type: "date",
          required: false,
          description: "Due date (ISO format)",
        },
      ],
      outputs: [{ id: "id", name: "Assignment ID", type: "string" }],
    },
    {
      id: "lesson_update",
      name: "Update Lesson",
      description: "Update a lesson in Lessonly",
      connectorType: "lessonly",
      resource: "lesson",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "lessonId", name: "Lesson ID", type: "number", required: true },
        { id: "title", name: "Title", type: "string", required: false },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Lesson ID", type: "string" },
        { id: "url", name: "Lesson URL", type: "string" },
      ],
    },
  ],
};
