import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const guruActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "guru",
  connectorName: "Guru",
  connectorIcon: "guru",
  actions: [
    {
      id: "card_create",
      name: "Create Card",
      description: "Create a new Guru knowledge card",
      connectorType: "guru",
      resource: "card",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "collection_id",
          name: "Collection ID",
          type: "string",
          required: true,
        },
        { id: "title", name: "Title", type: "string", required: true },
        {
          id: "content",
          name: "Content (HTML)",
          type: "string",
          required: true,
        },
      ],
      outputs: [
        { id: "cardId", name: "Card ID", type: "string" },
        { id: "url", name: "Card URL", type: "string" },
      ],
    },
    {
      id: "card_update",
      name: "Update Card",
      description: "Update an existing Guru knowledge card",
      connectorType: "guru",
      resource: "card",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        {
          id: "card_id",
          name: "Card ID",
          type: "string",
          required: true,
        },
        { id: "title", name: "Title", type: "string", required: false },
        {
          id: "content",
          name: "Content (HTML)",
          type: "string",
          required: false,
        },
      ],
      outputs: [
        { id: "cardId", name: "Card ID", type: "string" },
        { id: "url", name: "Card URL", type: "string" },
      ],
    },
  ],
};
