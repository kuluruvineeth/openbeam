import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const procoreActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "procore",
  connectorName: "Procore",
  connectorIcon: "procore",
  actions: [
    {
      id: "rfi_create",
      name: "Create RFI",
      description: "Create a new Request for Information in Procore",
      connectorType: "procore",
      resource: "rfi",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "projectId", name: "Project ID", type: "number", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "RFI fields (subject, question, assignee_id, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "RFI ID", type: "string" },
        { id: "url", name: "RFI URL", type: "string" },
      ],
    },
    {
      id: "rfi_update",
      name: "Update RFI",
      description: "Update an existing RFI in Procore",
      connectorType: "procore",
      resource: "rfi",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "projectId", name: "Project ID", type: "number", required: true },
        { id: "rfiId", name: "RFI ID", type: "string", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
        },
      ],
      outputs: [
        { id: "recordId", name: "RFI ID", type: "string" },
        { id: "url", name: "RFI URL", type: "string" },
      ],
    },
    {
      id: "submittal_create",
      name: "Create Submittal",
      description: "Create a new submittal in Procore",
      connectorType: "procore",
      resource: "submittal",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "projectId", name: "Project ID", type: "number", required: true },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: false,
          description: "Submittal fields (title, spec_section, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Submittal ID", type: "string" },
        { id: "url", name: "Submittal URL", type: "string" },
      ],
    },
  ],
};
