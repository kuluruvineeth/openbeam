import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const salesforceActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "salesforce",
  connectorName: "Salesforce",
  connectorIcon: "salesforce",
  actions: [
    {
      id: "record_create",
      name: "Create Record",
      description:
        "Create a new Salesforce record (Account, Contact, Opportunity, Case)",
      connectorType: "salesforce",
      resource: "record",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "sobject",
          name: "Object Type",
          type: "string",
          required: true,
          description: "Account, Contact, Opportunity, Case, Lead",
        },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description: "JSON object of field name → value pairs",
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
      description: "Update fields on an existing Salesforce record",
      connectorType: "salesforce",
      resource: "record",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "sobject",
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
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description: "JSON object of field name → value pairs to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Record ID", type: "string" },
        { id: "url", name: "Record URL", type: "string" },
      ],
    },
    {
      id: "record_search",
      name: "Search Records",
      description: "Query Salesforce records using SOQL",
      connectorType: "salesforce",
      resource: "record",
      category: "search",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "soql",
          name: "SOQL Query",
          type: "string",
          required: true,
          description: "SOQL query string",
        },
      ],
      outputs: [
        { id: "records", name: "Records", type: "array" },
        { id: "totalSize", name: "Total Count", type: "number" },
      ],
    },
  ],
};
