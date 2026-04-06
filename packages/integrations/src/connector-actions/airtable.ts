import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const airtableActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "airtable",
  connectorName: "Airtable",
  connectorIcon: "airtable",
  actions: [
    {
      id: "base_list",
      name: "List Bases",
      description:
        "List all Airtable bases accessible to the connected account. Returns each base's ID, name, and permission level. Use this FIRST to discover base IDs before calling table_list, record_create, or record_update. No parameters required.",
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
          description:
            "Array of bases with id (e.g. 'appXXXXXXXXXX'), name, and permissionLevel. Use the id for table_list.",
        },
      ],
    },
    {
      id: "table_list",
      name: "List Tables",
      description:
        "List all tables in an Airtable base, including their field schemas. Requires base_id — call base_list first. Returns table IDs, names, and field definitions. Use this before record_create or record_update to discover table IDs and required field names.",
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
            "Airtable base ID (e.g. 'appXXXXXXXXXX'). Call base_list to discover available base IDs.",
        },
      ],
      outputs: [
        {
          id: "tables",
          name: "Tables",
          type: "object",
          description:
            "Array of tables with id, name, description, primaryFieldId, and fields array (each field has id, name, type, and options).",
        },
      ],
    },
    {
      id: "record_create",
      name: "Create Record",
      description:
        "Create a new record (row) in an Airtable table. Requires base_id and table_id — call base_list then table_list first to discover them. Field names must match the table schema from table_list. Returns the record ID and URL.",
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
          description:
            "Airtable base ID (e.g. 'appXXXXXXXXXX'). Get from base_list.",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description:
            "Table ID (e.g. 'tblXXXXXXXXXX') or table name. Get from table_list.",
        },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description:
            "JSON object of field name to value pairs (e.g. { 'Name': 'Acme Corp', 'Status': 'Active', 'Priority': 'High' }). Field names must match the schema from table_list.",
        },
      ],
      outputs: [
        {
          id: "recordId",
          name: "Record ID",
          type: "string",
          description:
            "Created record ID (e.g. 'recXXXXXXXXXX') — use for record_update or record_delete.",
        },
        {
          id: "url",
          name: "Record URL",
          type: "string",
          description: "Direct URL to the record in Airtable.",
        },
      ],
    },
    {
      id: "record_update",
      name: "Update Record",
      description:
        "Update an existing record in an Airtable table. Requires base_id, table_id, and record_id — use base_list, table_list, and search_documents to discover them. Only specified fields are modified; omitted fields remain unchanged.",
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
          description: "Airtable base ID. Get from base_list.",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description: "Table ID or name. Get from table_list.",
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
          description:
            "Record ID to update (e.g. 'recXXXXXXXXXX'). Get from record_create output or search_documents.",
        },
        {
          id: "fields",
          name: "Fields",
          type: "object",
          required: true,
          description:
            "JSON object of field name to value pairs to update. Only specified fields change; others remain unchanged.",
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
    {
      id: "record_delete",
      name: "Delete Record",
      description:
        "Permanently delete a record from an Airtable table. This action is irreversible. Requires base_id, table_id, and record_id. Verify the correct record with search_documents before deleting.",
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
          description: "Airtable base ID. Get from base_list.",
        },
        {
          id: "table_id",
          name: "Table ID or Name",
          type: "string",
          required: true,
          description: "Table ID or name. Get from table_list.",
        },
        {
          id: "record_id",
          name: "Record ID",
          type: "string",
          required: true,
          description:
            "Record ID to delete (e.g. 'recXXXXXXXXXX'). Verify with search_documents before deleting.",
        },
      ],
      outputs: [
        {
          id: "recordId",
          name: "Record ID",
          type: "string",
          description: "Deleted record ID.",
        },
      ],
    },
  ],
};
