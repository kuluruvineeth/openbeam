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
        "Create a new HubSpot CRM record. Supports Contacts, Companies, Deals, and Tickets. Returns the record ID and URL. Use when the user asks to create, add, or register a new contact, company, deal, or ticket in HubSpot.",
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
          description:
            "HubSpot object type: 'contacts', 'companies', 'deals', or 'tickets'. Determines which CRM object to create.",
        },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description:
            "JSON object of property name to value pairs. Common properties — contacts: { firstname, lastname, email, phone }, companies: { name, domain, industry }, deals: { dealname, amount, dealstage, pipeline }, tickets: { subject, content, hs_pipeline, hs_pipeline_stage }.",
        },
      ],
      outputs: [
        {
          id: "recordId",
          name: "Record ID",
          type: "string",
          description:
            "Created record ID — use for record_update to modify this record later.",
        },
        {
          id: "url",
          name: "Record URL",
          type: "string",
          description: "Direct URL to the record in HubSpot.",
        },
      ],
    },
    {
      id: "record_update",
      name: "Update Record",
      description:
        "Update properties on an existing HubSpot CRM record. Requires objectType and record_id — use search_documents to find the record ID. Only specified properties are modified; omitted properties remain unchanged.",
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
          description:
            "HubSpot object type: 'contacts', 'companies', 'deals', or 'tickets'.",
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
          description:
            "HubSpot record ID to update. Get from record_create output or search_documents results.",
        },
        {
          id: "properties",
          name: "Properties",
          type: "object",
          required: true,
          description:
            "JSON object of property name to value pairs to update. Only specified properties change (e.g. { 'dealstage': 'closedwon', 'amount': '50000' }).",
        },
      ],
      outputs: [
        {
          id: "recordId",
          name: "Record ID",
          type: "string",
          description: "Updated record ID.",
        },
        {
          id: "url",
          name: "Record URL",
          type: "string",
          description: "Direct URL to the updated record.",
        },
      ],
    },
  ],
};
