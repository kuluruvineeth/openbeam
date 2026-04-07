import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const fileActions: ConnectorActionDefinition[] = [
  {
    id: "file_upload",
    name: "Upload File",
    description:
      "Upload a file or text snippet to one or more Slack channels. Returns the file ID. Use when the user asks to share a file, code snippet, or document in Slack.",
    connectorType: "slack",
    resource: "file",
    category: "create",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "channels",
        name: "Channels",
        type: "string",
        required: true,
        description:
          "Comma-separated channel IDs to share with (e.g. 'C01234ABCDE,C05678FGHIJ').",
      },
      {
        id: "content",
        name: "Content",
        type: "string",
        required: false,
        description:
          "File content as a string. For text/code snippets, provide content directly.",
      },
      {
        id: "filename",
        name: "Filename",
        type: "string",
        required: false,
        description:
          "Filename with extension (e.g. 'report.csv', 'script.py'). Extension determines syntax highlighting.",
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        required: false,
        description: "Display title shown in Slack for the uploaded file.",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "File ID",
        type: "string",
        description: "Uploaded file ID.",
      },
    ],
  },
];
