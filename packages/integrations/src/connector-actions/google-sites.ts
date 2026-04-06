import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const googleSitesActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "google_sites",
  connectorName: "Google Sites",
  connectorIcon: "google-sites",
  actions: [
    {
      id: "site_metadata",
      name: "Get Site Metadata",
      description: "Retrieve metadata for a Google Site",
      connectorType: "google_sites",
      resource: "site",
      category: "read",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "siteId",
          name: "Site ID",
          type: "string",
          required: true,
          description: "Google Sites site ID",
        },
      ],
      outputs: [
        { id: "siteId", name: "Site ID", type: "string" },
        { id: "url", name: "Site URL", type: "string" },
      ],
    },
  ],
};
