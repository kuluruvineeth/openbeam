import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const sharePointActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "sharepoint",
  connectorName: "Microsoft SharePoint",
  connectorIcon: "sharepoint",
  actions: [
    {
      id: "site_list",
      name: "List Sites",
      description:
        "List all SharePoint sites the user has access to. Use this to discover site IDs before calling drive_list.",
      connectorType: "sharepoint",
      resource: "site",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [],
      outputs: [{ id: "sites", name: "Sites", type: "array" }],
    },
    {
      id: "drive_list",
      name: "List Drives",
      description:
        "List document libraries (drives) for a SharePoint site or the current user. Use site_list first to get a site ID, then use this to discover drive IDs needed by folder_create and file_move.",
      connectorType: "sharepoint",
      resource: "drive",
      category: "read",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "site_id",
          name: "Site ID",
          type: "string",
          required: false,
          description:
            "SharePoint site ID. Omit to list the current user's drives.",
        },
      ],
      outputs: [{ id: "drives", name: "Drives", type: "array" }],
    },
    {
      id: "folder_create",
      name: "Create Folder",
      description:
        "Create a new folder in a SharePoint drive. Use site_list and drive_list first to discover the drive_id.",
      connectorType: "sharepoint",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "drive_id",
          name: "Drive ID",
          type: "string",
          required: true,
          description:
            "ID of the drive. Use drive_list to discover available drives.",
        },
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
      description:
        "Move a file to a different folder. Use site_list and drive_list first to discover the drive_id.",
      connectorType: "sharepoint",
      resource: "file",
      category: "update",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "drive_id",
          name: "Drive ID",
          type: "string",
          required: true,
          description:
            "ID of the drive. Use drive_list to discover available drives.",
        },
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
