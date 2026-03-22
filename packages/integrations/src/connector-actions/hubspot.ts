import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const hubspotActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "hubspot",
  connectorName: "HubSpot",
  connectorIcon: "hubspot",
  actions: [
    {
      id: "record_create",
      name: "Create Record",
      description:
        "Create a new HubSpot record (Contact, Company, Deal, Ticket)",
      connectorType: "hubspot",
      resource: "record",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "objectType",
          name: "Object Type",
          type: "string",
          required: true,
          description: "contacts, companies, deals, or tickets",
        },
        {
          id: "properties",
          name: "Properties",
          type: "json",
          required: true,
          description: "JSON object of property name to value pairs",
        },
      ],
      outputs: [
        { id: "recordId", name: "Record ID", type: "string" },
        { id: "url", name: "Record URL", type: "string" },
      ],
    },
    {
      id: "record_update",
      name: "Update Record",
      description: "Update properties on an existing HubSpot record",
      connectorType: "hubspot",
      resource: "record",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "objectType",
          name: "Object Type",
          type: "string",
          required: true,
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
        },
        {
          id: "properties",
          name: "Properties",
          type: "json",
          required: true,
          description: "JSON object of property name to value pairs to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Record ID", type: "string" },
        { id: "url", name: "Record URL", type: "string" },
      ],
    },
  ],
};
