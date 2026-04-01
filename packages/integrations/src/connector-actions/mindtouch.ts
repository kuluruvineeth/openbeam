import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const mindtouchActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "mindtouch",
  connectorName: "MindTouch",
  connectorIcon: "mindtouch",
  actions: [
    {
      id: "page_create",
      name: "Create Page",
      description: "Create a new page in MindTouch knowledge base",
      connectorType: "mindtouch",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "parentPageId",
          name: "Parent Page ID",
          type: "string",
          required: true,
        },
        { id: "title", name: "Title", type: "string", required: true },
        { id: "content", name: "Content", type: "html", required: true },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Page ID", type: "string" },
        { id: "url", name: "Page URL", type: "string" },
      ],
    },
    {
      id: "page_update_content",
      name: "Update Page Content",
      description: "Update the content of a MindTouch page",
      connectorType: "mindtouch",
      resource: "page",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "pageId", name: "Page ID", type: "string", required: true },
        { id: "content", name: "Content", type: "html", required: true },
      ],
      outputs: [
        { id: "id", name: "Page ID", type: "string" },
        { id: "url", name: "Page URL", type: "string" },
      ],
    },
    {
      id: "page_add_tags",
      name: "Add Tags to Page",
      description: "Add tags to a MindTouch page",
      connectorType: "mindtouch",
      resource: "page",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "pageId", name: "Page ID", type: "string", required: true },
        {
          id: "tags",
          name: "Tags",
          type: "array",
          required: false,
          description: "Array of tag strings",
        },
      ],
      outputs: [{ id: "id", name: "Page ID", type: "string" }],
    },
  ],
};
