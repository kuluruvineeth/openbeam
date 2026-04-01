import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const simpplrActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "simpplr",
  connectorName: "Simpplr",
  connectorIcon: "simpplr",
  actions: [
    {
      id: "page_create",
      name: "Create Page",
      description: "Create a new page in Simpplr intranet",
      connectorType: "simpplr",
      resource: "page",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "title", name: "Title", type: "string", required: true },
        { id: "content", name: "Content", type: "html", required: true },
        {
          id: "siteId",
          name: "Site ID",
          type: "string",
          required: true,
          description: "Simpplr site to create the page in",
        },
      ],
      outputs: [{ id: "id", name: "Page ID", type: "string" }],
    },
    {
      id: "page_update",
      name: "Update Page",
      description: "Update an existing Simpplr page",
      connectorType: "simpplr",
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
