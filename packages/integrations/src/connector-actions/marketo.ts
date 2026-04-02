import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const marketoActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "marketo",
  connectorName: "Marketo",
  connectorIcon: "marketo",
  actions: [
    {
      id: "lead_upsert",
      name: "Upsert Lead",
      description: "Create or update a lead in Marketo",
      connectorType: "marketo",
      resource: "lead",
      category: "create",
      stakes: "medium",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "properties",
          name: "Lead Properties",
          type: "object",
          required: true,
          description:
            "Lead field values (email, firstName, lastName, company, etc.)",
        },
      ],
      outputs: [
        { id: "recordId", name: "Lead ID", type: "string" },
        { id: "url", name: "Lead URL", type: "string" },
      ],
    },
  ],
};
