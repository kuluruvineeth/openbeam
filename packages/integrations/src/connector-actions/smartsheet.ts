import type { ConnectorActionsRegistry } from "@openbeam/types/connector-actions";

export const smartsheetActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "smartsheet",
  connectorName: "Smartsheet",
  connectorIcon: "smartsheet",
  actions: [
    {
      id: "sheet_list",
      name: "List Sheets",
      description:
        "List all sheets accessible to the current user. Use this to discover sheet IDs before adding or updating rows.",
      connectorType: "smartsheet",
      resource: "sheet",
      category: "list",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: true,
      inputs: [],
      outputs: [
        {
          id: "sheets",
          name: "Sheets",
          type: "array",
          description: "Array of { id, name, accessLevel }",
        },
      ],
    },
    {
      id: "sheet_create",
      name: "Create Sheet",
      description: "Create a new Smartsheet sheet",
      connectorType: "smartsheet",
      resource: "sheet",
      category: "create",
      stakes: "low",
      reversible: false,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "name", name: "Name", type: "string", required: true },
        {
          id: "columns",
          name: "Columns",
          type: "object",
          required: false,
          description: "Array of { title, type } column definitions",
        },
      ],
      outputs: [
        { id: "id", name: "Sheet ID", type: "string" },
        { id: "url", name: "Sheet URL", type: "string" },
      ],
    },
    {
      id: "row_add",
      name: "Add Row",
      description:
        "Add a row to a Smartsheet sheet. Requires sheetId — call sheet_list first to discover sheet IDs.",
      connectorType: "smartsheet",
      resource: "row",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: false,
      inputs: [
        { id: "sheetId", name: "Sheet ID", type: "string", required: true },
        {
          id: "cells",
          name: "Cells",
          type: "object",
          required: false,
          description: "Array of { columnId, value } cell objects",
        },
      ],
      outputs: [{ id: "id", name: "Row ID", type: "string" }],
    },
    {
      id: "row_update",
      name: "Update Row",
      description:
        "Update an existing row in a Smartsheet sheet. Requires sheetId — call sheet_list first to discover sheet IDs.",
      connectorType: "smartsheet",
      resource: "row",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      idempotent: true,
      inputs: [
        { id: "sheetId", name: "Sheet ID", type: "string", required: true },
        { id: "rowId", name: "Row ID", type: "string", required: true },
        {
          id: "cells",
          name: "Cells",
          type: "object",
          required: false,
          description: "Array of { columnId, value } cell objects",
        },
      ],
      outputs: [{ id: "id", name: "Row ID", type: "string" }],
    },
  ],
};
