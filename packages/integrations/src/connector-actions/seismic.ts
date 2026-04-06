import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const seismicActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "seismic",
  connectorName: "Seismic",
  connectorIcon: "seismic",
  actions: [
    {
      id: "content_update_metadata",
      name: "Update Content Metadata",
      description: "Update metadata on a Seismic content item",
      connectorType: "seismic",
      resource: "content",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "content_id",
          name: "Content ID",
          type: "string",
          required: true,
        },
        {
          id: "metadata",
          name: "Metadata",
          type: "object",
          required: false,
          description: "Metadata key-value pairs to update",
        },
      ],
      outputs: [
        { id: "contentId", name: "Content ID", type: "string" },
        { id: "url", name: "Content URL", type: "string" },
      ],
    },
  ],
};
