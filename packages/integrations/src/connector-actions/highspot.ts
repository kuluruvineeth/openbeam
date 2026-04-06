import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const highspotActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "highspot",
  connectorName: "Highspot",
  connectorIcon: "highspot",
  actions: [
    {
      id: "item_update_metadata",
      name: "Update Item Metadata",
      description: "Update metadata on a Highspot content item",
      connectorType: "highspot",
      resource: "item",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "item_id", name: "Item ID", type: "string", required: true },
        {
          id: "metadata",
          name: "Metadata",
          type: "object",
          required: false,
          description: "Metadata fields to update",
        },
      ],
      outputs: [
        { id: "itemId", name: "Item ID", type: "string" },
        { id: "url", name: "Item URL", type: "string" },
      ],
    },
    {
      id: "pitch_create",
      name: "Create Pitch",
      description: "Create a new pitch in Highspot",
      connectorType: "highspot",
      resource: "pitch",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        { id: "title", name: "Title", type: "string", required: true },
        {
          id: "description",
          name: "Description",
          type: "string",
          required: false,
        },
        {
          id: "recipients",
          name: "Recipients",
          type: "object",
          required: false,
          description: "Array of { email, name? } objects",
        },
        {
          id: "item_ids",
          name: "Item IDs",
          type: "array",
          required: false,
          description: "Array of content item IDs to include",
        },
      ],
      outputs: [
        { id: "pitchId", name: "Pitch ID", type: "string" },
        { id: "url", name: "Pitch URL", type: "string" },
      ],
    },
  ],
};
