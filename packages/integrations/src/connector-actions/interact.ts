import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const interactActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "interact",
  connectorName: "Interact",
  connectorIcon: "interact",
  actions: [
    {
      id: "page_create",
      name: "Create Page",
      description: "Create a new page in Interact intranet",
      connectorType: "interact",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "title", name: "Title", type: "string", required: true },
        { id: "content", name: "Content", type: "html", required: true },
        {
          id: "section",
          name: "Section",
          type: "string",
          required: false,
          description: "Section to create the page in",
        },
      ],
      outputs: [{ id: "id", name: "Page ID", type: "string" }],
    },
    {
      id: "page_update",
      name: "Update Page",
      description: "Update an existing page in Interact",
      connectorType: "interact",
      resource: "page",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "pageId", name: "Page ID", type: "string", required: true },
        { id: "title", name: "Title", type: "string", required: false },
        { id: "content", name: "Content", type: "html", required: false },
      ],
      outputs: [{ id: "id", name: "Page ID", type: "string" }],
    },
  ],
};
