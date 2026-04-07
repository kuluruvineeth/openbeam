import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const klueActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "klue",
  connectorName: "Klue",
  connectorIcon: "klue",
  actions: [
    {
      id: "intel_create",
      name: "Create Intel",
      description: "Create a new competitive intelligence item in Klue",
      connectorType: "klue",
      resource: "intel",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "title", name: "Title", type: "string", required: true },
        { id: "content", name: "Content", type: "string", required: true },
        {
          id: "source",
          name: "Source",
          type: "string",
          required: true,
          description: "Intel source name",
        },
        { id: "source_url", name: "Source URL", type: "url", required: false },
        {
          id: "competitor_ids",
          name: "Competitor IDs",
          type: "array",
          required: false,
        },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Intel ID", type: "string" },
        { id: "url", name: "Intel URL", type: "string" },
      ],
    },
    {
      id: "intel_update",
      name: "Update Intel",
      description: "Update an existing intel item in Klue",
      connectorType: "klue",
      resource: "intel",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        { id: "intelId", name: "Intel ID", type: "string", required: true },
        { id: "title", name: "Title", type: "string", required: false },
        { id: "content", name: "Content", type: "string", required: false },
        { id: "source", name: "Source", type: "string", required: false },
        { id: "tags", name: "Tags", type: "array", required: false },
      ],
      outputs: [
        { id: "id", name: "Intel ID", type: "string" },
        { id: "url", name: "Intel URL", type: "string" },
      ],
    },
  ],
};
