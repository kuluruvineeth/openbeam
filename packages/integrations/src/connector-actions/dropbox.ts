import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const dropboxActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "dropbox",
  connectorName: "Dropbox",
  connectorIcon: "dropbox",
  actions: [
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in Dropbox",
      connectorType: "dropbox",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "path",
          name: "Folder Path",
          type: "string",
          required: true,
          description:
            "Full path for the new folder (e.g., /Projects/New Folder)",
        },
      ],
      outputs: [
        { id: "id", name: "Folder ID", type: "string" },
        { id: "path", name: "Folder Path", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
    {
      id: "file_move",
      name: "Move File",
      description: "Move a file or folder to a new location",
      connectorType: "dropbox",
      resource: "file",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "from_path",
          name: "Source Path",
          type: "string",
          required: true,
          description: "Current path of the file or folder",
        },
        {
          id: "to_path",
          name: "Destination Path",
          type: "string",
          required: true,
          description: "New path for the file or folder",
        },
      ],
      outputs: [
        { id: "id", name: "Entry ID", type: "string" },
        { id: "path", name: "New Path", type: "string" },
        { id: "url", name: "URL", type: "string" },
      ],
    },
    {
      id: "file_delete",
      name: "Delete File",
      description: "Delete a file or folder from Dropbox",
      connectorType: "dropbox",
      resource: "file",
      category: "delete",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "path",
          name: "Path",
          type: "string",
          required: true,
          description: "Path of the file or folder to delete",
        },
      ],
      outputs: [{ id: "path", name: "Deleted Path", type: "string" }],
    },
  ],
};
