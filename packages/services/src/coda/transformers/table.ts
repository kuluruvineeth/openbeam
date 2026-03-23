import type { CodaTransformContext } from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import type { CodaDoc } from "../api/docs";
import type { CodaColumn, CodaTable } from "../api/tables";

export function transformCodaTable(
  table: CodaTable,
  doc: CodaDoc,
  columns: CodaColumn[],
  context: CodaTransformContext
): GenericDocument {
  const columnNames = columns.map((c) => c.name);
  const parts: string[] = [];
  parts.push(`Columns: ${columnNames.join(", ")}`);
  parts.push(`Rows: ${table.rowCount}`);
  if (table.layout) {
    parts.push(`Layout: ${table.layout}`);
  }

  const content = parts.join(" — ");
  const createdAt = new Date(table.createdAt).getTime();
  const updatedAt = new Date(table.updatedAt).getTime();

  return {
    id: `${context.connectorId}_table_${doc.id}_${table.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${doc.id}:${table.id}`,
    document_type: "spreadsheet",
    title: table.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: table.browserLink || doc.browserLink,
    author_name: doc.ownerName,
    author_email: doc.owner,
    is_public: false,
    access_control: [],
    metadata: {
      docId: doc.id,
      docName: doc.name,
      rowCount: String(table.rowCount),
      columnCount: String(columns.length),
      layout: table.layout || "",
      tableType: table.tableType || "table",
      columns: JSON.stringify(columnNames),
    },
  };
}
