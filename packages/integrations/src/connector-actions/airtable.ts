import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const airtableActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "airtable",
  connectorName: "Airtable",
  connectorIcon: "airtable",
  actions: [
    {
      id: "base_list",
      name: "List Bases",
      description:
        "List all Airtable bases accessible to the connected account. Use this first to discover base IDs before calling table_list or record_create.",
      connectorType: "airtable",
      resource: "base",
      category: "list",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [],
      outputs: [
        {
          id: "bases",
          name: "Bases",
          type: "object",
          description: "Array of bases with id, name, and permissionLevel",
        },
      ],
    },
    {
      id: "table_list",
      name: "List Tables",
      description:
        "List all tables in an Airtable base, including field schemas. Use base_list first to get the base_id, then use this to discover table IDs and field names before creating or updating records.",
      connectorType: "airtable",
      resource: "table",
      category: "list",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "base_id",
          name: "Base ID",
          type: "string",
          required: true,
          description:
            "Airtable base ID (e.g. appXXXXXXXXXX) — get from base_list",
        },
      ],
      outputs: [
        {
          id: "tables",
          name: "Tables",
          type: "object",
          description:
            "Array of tables with id, name, description, primaryFieldId, and fields",
        },
      ],
    },
    {
      id: "record_create",
      name: "Create Record",
      description:
        "Create a new record in an Airtable table. Requires base_id and table — call base_list then table_list first to discover them.",
      connectorType: "airtable",
      resource: "record",
      category: "create",
      stakes: "medium",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "base_id",
          name: "Base ID",
          type: "string",
          required: true,
          description: "Airtable base ID (e.g. appXXXXXXXXXX)",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description: "Table ID or name within the base",
        },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description: "JSON object of field name to value pairs",
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
      description: "Update an existing record in an Airtable table",
      connectorType: "airtable",
      resource: "record",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        {
          id: "base_id",
          name: "Base ID",
          type: "string",
          required: true,
          description: "Airtable base ID (e.g. appXXXXXXXXXX)",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description: "Table ID or name within the base",
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
          description: "ID of the record to update",
        },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description: "JSON object of field name to value pairs to update",
        },
      ],
      outputs: [
        { id: "recordId", name: "Record ID", type: "string" },
        { id: "url", name: "Record URL", type: "string" },
      ],
    },
    {
      id: "record_delete",
      name: "Delete Record",
      description: "Delete a record from an Airtable table",
      connectorType: "airtable",
      resource: "record",
      category: "delete",
      stakes: "high",
      reversible: false,
      batchSupport: false,
      inputs: [
        {
          id: "base_id",
          name: "Base ID",
          type: "string",
          required: true,
          description: "Airtable base ID (e.g. appXXXXXXXXXX)",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description: "Table ID or name within the base",
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
          description: "ID of the record to delete",
        },
      ],
      outputs: [{ id: "recordId", name: "Record ID", type: "string" }],
    },
  ],
};
