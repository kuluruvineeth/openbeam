import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const bynderActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "bynder",
  connectorName: "Bynder",
  connectorIcon: "bynder",
  actions: [
    {
      id: "collection_create",
      name: "Create Collection",
      description: "Create a new collection in Bynder",
      connectorType: "bynder",
      resource: "collection",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "name",
          name: "Name",
          type: "string",
          required: true,
          description: "Collection name",
        },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
      ],
      outputs: [
        { id: "collectionId", name: "Collection ID", type: "string" },
        { id: "url", name: "Collection URL", type: "string" },
      ],
    },
    {
      id: "collection_add_asset",
      name: "Add Asset to Collection",
      description: "Add an existing asset to a Bynder collection",
      connectorType: "bynder",
      resource: "collection",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "collectionId",
          name: "Collection ID",
          type: "string",
          required: true,
        },
        { id: "assetId", name: "Asset ID", type: "string", required: true },
      ],
      outputs: [
        { id: "collectionId", name: "Collection ID", type: "string" },
        { id: "url", name: "Collection URL", type: "string" },
      ],
    },
  ],
};
