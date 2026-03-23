import type { CodaTransformContext } from "@openbeam/types/services/connectors/coda";
import type { GenericDocument } from "@openbeam/vespa";
import type { CodaDoc } from "../api/docs";
import type { CodaRow } from "../api/rows";
import type { CodaTable } from "../api/tables";
import { formatRowValues } from "./utils";

export function transformCodaRow(
  row: CodaRow,
  table: CodaTable,
  doc: CodaDoc,
  context: CodaTransformContext
): GenericDocument {
  const content = formatRowValues(row.values);
  const createdAt = new Date(row.createdAt).getTime();
  const updatedAt = new Date(row.updatedAt).getTime();

  return {
    id: `${context.connectorId}_row_${doc.id}_${table.id}_${row.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: `${doc.id}:${table.id}:${row.id}`,
    document_type: "record",
    title: row.name || `Row ${row.index}`,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: row.browserLink || table.browserLink || doc.browserLink,
    author_name: doc.ownerName,
    author_email: doc.owner,
    is_public: false,
    access_control: [],
    metadata: {
      docId: doc.id,
      docName: doc.name,
      tableId: table.id,
      tableName: table.name,
      rowIndex: String(row.index),
    },
  };
}
