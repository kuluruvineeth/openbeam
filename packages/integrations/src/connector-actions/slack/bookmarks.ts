import type { ConnectorActionDefinition } from "@openbeam/types/connector-actions";

export const bookmarkActions: ConnectorActionDefinition[] = [
  {
    id: "bookmark_add",
    name: "Add Bookmark",
    description:
      "Add a bookmark (pinned link) to a Slack channel. Bookmarks appear at the top of the channel. Use when the user asks to pin a link, bookmark a URL, or save a reference in a channel.",
    connectorType: "slack",
    resource: "bookmark",
    category: "create",
    stakes: "low",
    reversible: true,
    batchSupport: false,
    idempotent: false,
    inputs: [
      {
        id: "channel",
        name: "Channel",
        type: "string",
        required: true,
        description: "Channel ID to add the bookmark to.",
      },
      {
        id: "title",
        name: "Title",
        type: "string",
        required: true,
        description:
          "Display title for the bookmark (e.g. 'Project Wiki', 'Sprint Board').",
      },
      {
        id: "link",
        name: "Link",
        type: "url",
        required: true,
        description:
          "Full URL to bookmark (e.g. 'https://notion.so/project-docs').",
      },
    ],
    outputs: [
      {
        id: "id",
        name: "Bookmark ID",
        type: "string",
        description: "Created bookmark ID.",
      },
    ],
  },
];
