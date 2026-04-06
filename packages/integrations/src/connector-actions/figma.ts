import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const figmaActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "figma",
  connectorName: "Figma",
  connectorIcon: "figma",
  actions: [
    {
      id: "comment_add",
      name: "Add Comment",
      description: "Add a comment to a Figma design file",
      connectorType: "figma",
      resource: "comment",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "file_key",
          name: "File Key",
          type: "string",
          required: true,
          description: "Figma file key (from URL)",
        },
        {
          id: "message",
          name: "Message",
          type: "string",
          required: true,
          description: "Comment text",
        },
        {
          id: "parent_id",
          name: "Parent Comment ID",
          type: "string",
          required: false,
          description: "Reply to an existing comment",
        },
      ],
      outputs: [{ id: "commentId", name: "Comment ID", type: "string" }],
    },
  ],
};
