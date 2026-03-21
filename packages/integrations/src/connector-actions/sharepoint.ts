import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const sharePointActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "sharepoint",
  connectorName: "Microsoft SharePoint",
  connectorIcon: "sharepoint",
  actions: [
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in a SharePoint drive",
      connectorType: "sharepoint",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "drive_id", name: "Drive ID", type: "string", required: true },
        {
          id: "parent_path",
          name: "Parent Path",
          type: "string",
          required: true,
        },
        {
          id: "folder_name",
          name: "Folder Name",
          type: "string",
          required: true,
        },
      ],
      outputs: [
        { id: "fileId", name: "Folder ID", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
    {
      id: "file_move",
      name: "Move File",
      description: "Move a file to a different folder",
      connectorType: "sharepoint",
      resource: "file",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "drive_id", name: "Drive ID", type: "string", required: true },
        { id: "item_id", name: "Item ID", type: "string", required: true },
        {
          id: "new_parent_id",
          name: "New Parent Folder ID",
          type: "string",
          required: true,
        },
      ],
      outputs: [
        { id: "fileId", name: "File ID", type: "string" },
        { id: "url", name: "File URL", type: "string" },
      ],
    },
  ],
};
