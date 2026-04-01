import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const mindtickleActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "mindtickle",
  connectorName: "Mindtickle",
  connectorIcon: "mindtickle",
  actions: [
    {
      id: "mission_create",
      name: "Create Mission",
      description: "Create a new coaching mission in Mindtickle",
      connectorType: "mindtickle",
      resource: "mission",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "name", name: "Name", type: "string", required: true },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: true,
        },
        {
          id: "mission_type",
          name: "Mission Type",
          type: "string",
          required: true,
          description: "Type of mission (e.g. pitch_practice, quiz)",
        },
        { id: "due_date", name: "Due Date", type: "date", required: false },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Mission ID", type: "string" },
        { id: "url", name: "Mission URL", type: "string" },
      ],
    },
    {
      id: "content_update",
      name: "Update Content",
      description: "Update content metadata in Mindtickle",
      connectorType: "mindtickle",
      resource: "content",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "contentId", name: "Content ID", type: "string", required: true },
        { id: "title", name: "Title", type: "string", required: false },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
        { id: "category", name: "Category", type: "string", required: false },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Content ID", type: "string" },
        { id: "url", name: "Content URL", type: "string" },
      ],
    },
  ],
};
