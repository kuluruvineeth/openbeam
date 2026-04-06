import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const egnyteActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "egnyte",
  connectorName: "Egnyte",
  connectorIcon: "egnyte",
  actions: [
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in Egnyte",
      connectorType: "egnyte",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "path",
          name: "Path",
          type: "string",
          required: true,
          description: "Full folder path (e.g. /Shared/Projects/New)",
        },
      ],
      outputs: [
        { id: "path", name: "Path", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
    {
      id: "item_delete",
      name: "Delete Item",
      description: "Delete a file or folder in Egnyte",
      connectorType: "egnyte",
      resource: "item",
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
          description: "Path of the item to delete",
        },
      ],
      outputs: [{ id: "path", name: "Deleted Path", type: "string" }],
    },
    {
      id: "shared_link_create",
      name: "Create Shared Link",
      description: "Create a shared link for a file or folder in Egnyte",
      connectorType: "egnyte",
      resource: "shared_link",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "path",
          name: "Path",
          type: "string",
          required: true,
          description: "Path to share",
        },
        {
          id: "linkType",
          name: "Link Type",
          type: "string",
          required: false,
          description: "file or folder (default: file)",
        },
        {
          id: "accessibility",
          name: "Accessibility",
          type: "string",
          required: false,
          description: "Access level (default: domain)",
        },
      ],
      outputs: [
        { id: "linkId", name: "Link ID", type: "string" },
        { id: "url", name: "Shared Link URL", type: "string" },
      ],
    },
  ],
};
