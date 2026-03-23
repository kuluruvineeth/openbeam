import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const onenoteActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "onenote",
  connectorName: "Microsoft OneNote",
  connectorIcon: "onenote",
  actions: [
    {
      id: "page_create",
      name: "Create Page",
      description: "Create a new page in a OneNote section",
      connectorType: "onenote",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "section_id",
          name: "Section ID",
          type: "string",
          required: true,
          description: "ID of the section to create the page in",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: true,
          description: "Page title",
        },
        {
          id: "html_content",
          name: "HTML Content",
          type: "string",
          required: true,
          description: "Page body content in HTML format",
        },
      ],
      outputs: [
        { id: "pageId", name: "Page ID", type: "string" },
        { id: "url", name: "Page URL", type: "string" },
      ],
    },
    {
      id: "page_update",
      name: "Update Page Content",
      description: "Append or replace content on a OneNote page",
      connectorType: "onenote",
      resource: "page",
      category: "update",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "page_id",
          name: "Page ID",
          type: "string",
          required: true,
          description: "ID of the page to update",
        },
        {
          id: "target",
          name: "Target Element",
          type: "string",
          required: true,
          description:
            "CSS selector for the target element (e.g. body, #block-id)",
        },
        {
          id: "action",
          name: "Action",
          type: "string",
          required: true,
          description: "Update action: 'append' or 'replace'",
        },
        {
          id: "content",
          name: "Content",
          type: "string",
          required: true,
          description: "HTML content to append or replace",
        },
      ],
      outputs: [{ id: "pageId", name: "Page ID", type: "string" }],
    },
  ],
};
