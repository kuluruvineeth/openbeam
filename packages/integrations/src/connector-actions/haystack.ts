import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const haystackActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "haystack",
  connectorName: "Haystack",
  connectorIcon: "haystack",
  actions: [
    {
      id: "person_update",
      name: "Update Person",
      description: "Update a person's profile in Haystack",
      connectorType: "haystack",
      resource: "person",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "personId", name: "Person ID", type: "string", required: true },
        { id: "title", name: "Title", type: "string", required: false },
        { id: "phone", name: "Phone", type: "string", required: false },
        { id: "bio", name: "Bio", type: "string", required: false },
        { id: "pronouns", name: "Pronouns", type: "string", required: false },
      ],
      outputs: [{ id: "id", name: "Person ID", type: "string" }],
    },
  ],
};
