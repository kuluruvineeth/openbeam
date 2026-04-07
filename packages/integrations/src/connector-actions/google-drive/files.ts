import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const fileActions: ConnectorActionDefinition[] = [
  {
    id: "file_get",
    name: "Get File",
    description:
      "Retrieve metadata for a Google Drive file by ID. Returns name, MIME type, size, owners, and sharing status. Use file_search to find the file ID first. Use this to inspect a file before moving, sharing, or copying it.",
    connectorType: "google_drive",
    resource: "file",
    category: "read",
    stakes: "low",
    reversible: false,
    batchSupport: true,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description:
          "Google Drive file ID. Get from file_search results or file_create output.",
      },
      {
        id: "fields",
        name: "Fields",
        type: "string",
        required: false,
        description:
          "Comma-separated fields to include (e.g. 'name,mimeType,size,webViewLink,permissions'). Omit for default fields.",
      },
    ],
    outputs: [
      {
        id: "file",
        name: "File",
        type: "object",
        description:
          "File metadata including name, mimeType, size, webViewLink, owners, and modifiedTime.",
      },
    ],
  },
  {
    id: "file_search",
    name: "Search Files",
    description:
      "Search for files and folders in Google Drive using Drive's query syntax. Returns up to 100 results with ID, name, MIME type, and URL. Use this to find files before moving, sharing, copying, renaming, or deleting them.",
    connectorType: "google_drive",
    resource: "file",
    category: "search",
    stakes: "low",
    reversible: false,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "query",
        name: "Query",
        type: "string",
        required: true,
        description:
          "Drive query string (e.g. \"name contains 'report'\", \"mimeType = 'application/pdf'\", \"'folderId' in parents\"). See Google Drive API query documentation for full syntax.",
      },
      {
        id: "pageSize",
        name: "Page Size",
        type: "number",
        required: false,
        description: "Results per page (default 50, max 1000).",
      },
      {
        id: "orderBy",
        name: "Order By",
        type: "string",
        required: false,
        description:
          "Sort order (e.g. 'modifiedTime desc', 'name', 'createdTime desc').",
      },
    ],
    outputs: [
      {
        id: "files",
        name: "Files",
        type: "array",
        description:
          "Matching files with id, name, mimeType, webViewLink, and modifiedTime.",
      },
      {
        id: "nextPageToken",
        name: "Next Page Token",
        type: "string",
        description: "Pagination token for fetching more results.",
      },
    ],
  },
  {
    id: "file_create",
    name: "Create File",
    description:
      "Create a new file in Google Drive. Optionally place it in a specific folder by providing parent folder IDs — use file_search to find folder IDs. Returns the file ID and web link. Use when the user asks to create a document, spreadsheet, or upload content.",
    connectorType: "google_drive",
    resource: "file",
    category: "create",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "name",
        name: "Name",
        type: "string",
        required: true,
        description:
          "File name with extension (e.g. 'Q4 Report.docx', 'Budget.xlsx', 'Notes.txt').",
      },
      {
        id: "mimeType",
        name: "MIME Type",
        type: "string",
        required: false,
        description:
          "File MIME type. For Google Docs: 'application/vnd.google-apps.document', Sheets: 'application/vnd.google-apps.spreadsheet', Slides: 'application/vnd.google-apps.presentation'.",
      },
      {
        id: "parents",
        name: "Parent Folders",
        type: "array",
        required: false,
        description:
          "Array of parent folder IDs to place the file in. Use file_search to find folder IDs. Omit for root 'My Drive'.",
      },
      {
        id: "content",
        name: "Content",
        type: "string",
        required: false,
        description:
          "File content as text. For Google Docs, provide plain text or HTML.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description:
          "Created file ID — use for file_move, file_rename, permission_create, etc.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Created file name.",
      },
      {
        id: "webViewLink",
        name: "Web Link",
        type: "string",
        description: "Direct URL to view the file in Google Drive.",
      },
    ],
  },
  {
    id: "file_copy",
    name: "Copy File",
    description:
      "Create a copy of an existing Google Drive file. Requires the source file ID — use file_search to find it. Optionally place the copy in a different folder. Use when the user asks to duplicate or copy a file.",
    connectorType: "google_drive",
    resource: "file",
    category: "create",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description: "Source file ID to copy. Get from file_search results.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        required: false,
        description:
          "Name for the copy. Defaults to 'Copy of {original name}'.",
      },
      {
        id: "parents",
        name: "Parent Folders",
        type: "array",
        required: false,
        description:
          "Destination folder IDs. Omit to place in same folder as original.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description: "Copied file ID.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "Copied file name.",
      },
    ],
  },
  {
    id: "file_move",
    name: "Move File",
    description:
      "Move a file to a different Google Drive folder. Requires the file ID and destination folder ID — use file_search to find both. Use when the user asks to move, organize, or relocate a file.",
    connectorType: "google_drive",
    resource: "file",
    category: "update",
    stakes: "medium",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description: "File ID to move. Get from file_search.",
      },
      {
        id: "addParents",
        name: "Destination Folder",
        type: "string",
        required: true,
        description:
          "Target folder ID to move the file to. Use file_search with mimeType='application/vnd.google-apps.folder' to find folders.",
      },
      {
        id: "removeParents",
        name: "Source Folder",
        type: "string",
        required: false,
        description:
          "Current parent folder ID to remove from. Use file_get to check current parents.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description: "Moved file ID.",
      },
      {
        id: "parents",
        name: "Parents",
        type: "array",
        description: "New parent folder IDs.",
      },
    ],
  },
  {
    id: "file_rename",
    name: "Rename File",
    description:
      "Rename a file or folder in Google Drive. Requires the file ID — use file_search to find it. Only the name is changed; location and content remain the same.",
    connectorType: "google_drive",
    resource: "file",
    category: "update",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description: "File or folder ID to rename. Get from file_search.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        required: true,
        description: "New name with extension (e.g. 'Updated Report.docx').",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description: "Renamed file ID.",
      },
      {
        id: "name",
        name: "Name",
        type: "string",
        description: "New file name.",
      },
    ],
  },
  {
    id: "file_delete",
    name: "Delete File",
    description:
      "Move a file to Google Drive's trash. The file can be recovered from trash for 30 days. Requires the file ID — use file_search to verify the correct file before deleting.",
    connectorType: "google_drive",
    resource: "file",
    category: "delete",
    stakes: "high",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "fileId",
        name: "File ID",
        type: "string",
        required: true,
        description:
          "File ID to trash. Get from file_search. Verify with file_get before deleting.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description: "Trashed file ID.",
      },
    ],
  },
];
