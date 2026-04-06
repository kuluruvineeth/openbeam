import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const canvaActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "canva",
  connectorName: "Canva",
  connectorIcon: "canva",
  actions: [
    {
      id: "design_create",
      name: "Create Design",
      description: "Create a new design in Canva",
      connectorType: "canva",
      resource: "design",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "design_type",
          name: "Design Type",
          type: "string",
          required: false,
          description: "Type of design (e.g. Presentation, Poster)",
        },
        {
          id: "title",
          name: "Title",
          type: "string",
          required: false,
          description: "Design title",
        },
        {
          id: "width",
          name: "Width",
          type: "number",
          required: false,
          description: "Width in pixels",
        },
        {
          id: "height",
          name: "Height",
          type: "number",
          required: false,
          description: "Height in pixels",
        },
      ],
      outputs: [
        { id: "recordId", name: "Design ID", type: "string" },
        { id: "url", name: "Design URL", type: "string" },
      ],
    },
    {
      id: "folder_create",
      name: "Create Folder",
      description: "Create a new folder in Canva",
      connectorType: "canva",
      resource: "folder",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Folder name",
        },
        {
          id: "parent_folder_id",
          name: "Parent Folder ID",
          type: "string",
          required: false,
          description: "Parent folder ID",
        },
      ],
      outputs: [
        { id: "recordId", name: "Folder ID", type: "string" },
        { id: "url", name: "Folder URL", type: "string" },
      ],
    },
  ],
};
