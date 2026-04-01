import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const showpadActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "showpad",
  connectorName: "Showpad",
  connectorIcon: "showpad",
  actions: [
    {
      id: "channel_create",
      name: "Create Channel",
      description: "Create a new shared space channel in Showpad",
      connectorType: "showpad",
      resource: "channel",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "name", name: "Name", type: "string", required: true },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
      ],
      outputs: [
        { id: "channelId", name: "Channel ID", type: "string" },
        { id: "url", name: "Channel URL", type: "string" },
      ],
    },
    {
      id: "asset_update_metadata",
      name: "Update Asset Metadata",
      description: "Update metadata on a Showpad asset",
      connectorType: "showpad",
      resource: "asset",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "assetId", name: "Asset ID", type: "string", required: true },
        {
          id: "metadata",
          name: "Metadata",
          type: "json",
          required: false,
          description: "Metadata key-value pairs",
        },
      ],
      outputs: [
        { id: "assetId", name: "Asset ID", type: "string" },
        { id: "url", name: "Asset URL", type: "string" },
      ],
    },
  ],
};
