import type { ConnectorActionsRegistry } from "@openbeam/types/canvas";

export const smartsheetActionsRegistry: ConnectorActionsRegistry = {
  connectorType: "smartsheet",
  connectorName: "Smartsheet",
  connectorIcon: "smartsheet",
  actions: [
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
      inputs: [
        { id: "name", name: "Name", type: "string", required: true },
        {
          id: "columns",
          name: "Columns",
          type: "json",
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
      description: "Add a row to a Smartsheet sheet",
      connectorType: "smartsheet",
      resource: "row",
      category: "create",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "sheetId", name: "Sheet ID", type: "string", required: true },
        {
          id: "cells",
          name: "Cells",
          type: "json",
          required: false,
          description: "Array of { columnId, value } cell objects",
        },
      ],
      outputs: [{ id: "id", name: "Row ID", type: "string" }],
    },
    {
      id: "row_update",
      name: "Update Row",
      description: "Update an existing row in a Smartsheet sheet",
      connectorType: "smartsheet",
      resource: "row",
      category: "update",
      stakes: "low",
      reversible: true,
      batchSupport: false,
      inputs: [
        { id: "sheetId", name: "Sheet ID", type: "string", required: true },
        { id: "rowId", name: "Row ID", type: "string", required: true },
        {
          id: "cells",
          name: "Cells",
          type: "json",
          required: false,
          description: "Array of { columnId, value } cell objects",
        },
      ],
      outputs: [{ id: "id", name: "Row ID", type: "string" }],
    },
  ],
};
