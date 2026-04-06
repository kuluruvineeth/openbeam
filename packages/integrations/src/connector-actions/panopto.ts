import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const panoptoActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "panopto",
  connectorName: "Panopto",
  connectorIcon: "panopto",
  actions: [
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in Panopto",
      connectorType: "panopto",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description: "Folder properties (Name, ParentFolder, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Folder ID", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
    {
      id: "session_update",
      name: "Update Session",
      description: "Update a Panopto video session",
      connectorType: "panopto",
      resource: "session",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "sessionId", name: "Session ID", type: "string", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "Session fields to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Session ID", type: "string" },
        { id: "url", name: "Session URL", type: "string" },
      ],
    },
    {
      id: "session_move",
      name: "Move Session",
      description: "Move a Panopto session to a different folder",
      connectorType: "panopto",
      resource: "session",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "sessionId", name: "Session ID", type: "string", required: true },
        {
          id: "folderId",
          name: "Target Folder ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [
        { id: "recordId", name: "Session ID", type: "string" },
        { id: "url", name: "Session URL", type: "string" },
      ],
    },
  ],
};
