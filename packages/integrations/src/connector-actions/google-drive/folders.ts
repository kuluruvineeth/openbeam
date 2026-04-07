import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const folderActions: ConnectorActionDefinition[] = [
  {
    id: "folder_create",
    name: "Create Folder",
    description:
      "Create a new folder in Google Drive. Optionally nest it inside a parent folder by providing parent IDs — use file_search to find parent folder IDs. Returns the folder ID and web link. Use when the user asks to create or organize folders.",
    connectorType: "google_drive",
    resource: "folder",
    category: "create",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "name",
        name: "Name",
        type: "string",
        required: true,
        description: "Folder name (e.g. 'Q4 Reports', 'Project Alpha').",
      },
      {
        id: "parents",
        name: "Parent Folders",
        type: "array",
        required: false,
        description:
          "Parent folder IDs to nest this folder under. Omit for root 'My Drive'. Use file_search to find folder IDs.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Folder ID",
        type: "string",
        description:
          "Created folder ID — use as parent in file_create, file_move, or folder_create.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Created folder name.",
      },
      {
        id: "webViewLink",
        name: "Web Link",
        type: "string",
        description: "Direct URL to the folder in Google Drive.",
      },
    ],
  },
];
