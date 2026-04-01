import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const fellowActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "fellow",
  connectorName: "Fellow",
  connectorIcon: "fellow",
  actions: [
    {
      id: "action_item_create",
      name: "Create Action Item",
      description: "Create a new action item in Fellow",
      connectorType: "fellow",
      resource: "action_item",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "title", name: "Title", type: "string", required: true },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
        {
          id: "assignee_email",
          name: "Assignee Email",
          type: "email",
          required: false,
        },
        { id: "due_date", name: "Due Date", type: "date", required: false },
        {
          id: "meeting_id",
          name: "Meeting ID",
          type: "string",
          required: false,
        },
      ],
      outputs: [
        { id: "id", name: "Action Item ID", type: "string" },
        { id: "url", name: "Action Item URL", type: "string" },
      ],
    },
    {
      id: "action_item_update",
      name: "Update Action Item",
      description: "Update an existing Fellow action item",
      connectorType: "fellow",
      resource: "action_item",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "actionItemId",
          name: "Action Item ID",
          type: "string",
          required: true,
        },
        { id: "title", name: "Title", type: "string", required: false },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
        {
          id: "completed",
          name: "Completed",
          type: "boolean",
          required: false,
        },
        { id: "due_date", name: "Due Date", type: "date", required: false },
      ],
      outputs: [
        { id: "id", name: "Action Item ID", type: "string" },
        { id: "url", name: "Action Item URL", type: "string" },
      ],
    },
    {
      id: "meeting_note_add",
      name: "Add Meeting Note",
      description: "Add a note to a Fellow meeting",
      connectorType: "fellow",
      resource: "meeting",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "meetingId", name: "Meeting ID", type: "string", required: true },
        { id: "body", name: "Note Body", type: "markdown", required: true },
      ],
      outputs: [{ id: "id", name: "Note ID", type: "string" }],
    },
  ],
};
