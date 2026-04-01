import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const lucidActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "lucid",
  connectorName: "Lucidchart",
  connectorIcon: "lucid",
  actions: [
    {
      id: "document_create",
      name: "Create Document",
      description: "Create a new Lucidchart document",
      connectorType: "lucid",
      resource: "document",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "json",
          required: false,
          description: "Document properties (title, product, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Document ID", type: "string" },
        { id: "url", name: "Document URL", type: "string" },
      ],
    },
    {
      id: "document_update",
      name: "Update Document",
      description: "Update an existing Lucidchart document",
      connectorType: "lucid",
      resource: "document",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "document_id",
          name: "Document ID",
          type: "string",
          required: true,
        },
        { id: "properties", name: "Properties", type: "json", required: false },
      ],
      outputs: [
        { id: "recordId", name: "Document ID", type: "string" },
        { id: "url", name: "Document URL", type: "string" },
      ],
    },
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in Lucidchart",
      connectorType: "lucid",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Properties",
          type: "json",
          required: false,
          description: "Folder properties (name, parent, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Folder ID", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
  ],
};
