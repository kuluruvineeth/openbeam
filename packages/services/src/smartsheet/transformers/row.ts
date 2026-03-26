import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartsheetColumn, SmartsheetRow } from "../api/sheets";
import { buildSmartsheetRowUrl } from "./utils";

export interface TransformRowParams {
  row: SmartsheetRow;
  sheet: {
    id: number;
    name: string;
    permalink: string;
    columns: SmartsheetColumn[];
  };
  context: SmartsheetTransformContext;
}

function buildRowContent(
  row: SmartsheetRow,
  columnMap: Map<number, string>
): string {
  const parts: string[] = [];

  for (const cell of row.cells) {
    const columnName =
      columnMap.get(cell.columnId) ?? `Column ${cell.columnId}`;
    const displayVal = cell.displayValue ?? cell.value;
    if (displayVal !== undefined && displayVal !== null && displayVal !== "") {
      parts.push(`${columnName}: ${displayVal}`);
    }
  }

  parts.push(`Row #${row.rowNumber}`);

  if (row.locked) {
    parts.push("Locked: Yes");
  }

  return parts.join("\n");
}

function buildRowTitle(
  row: SmartsheetRow,
  columns: SmartsheetColumn[]
): string {
  const primaryCol = columns.find((c) => c.primary);
  if (primaryCol) {
    const primaryCell = row.cells.find((c) => c.columnId === primaryCol.id);
    const val = primaryCell?.displayValue ?? primaryCell?.value;
    if (val !== undefined && val !== null && val !== "") {
      return String(val);
    }
  }
  return `Row #${row.rowNumber}`;
}

function buildRowMetadata(
  row: SmartsheetRow,
  sheet: TransformRowParams["sheet"]
): GenericDocument["metadata"] {
  return {
    rowId: String(row.id),
    rowNumber: row.rowNumber,
    sheetId: String(sheet.id),
    sheetName: sheet.name,
    ...(row.parentId && { parentRowId: String(row.parentId) }),
    ...(row.locked !== undefined && { locked: row.locked }),
  };
}

export async function transformRow(
  params: TransformRowParams
): Promise<GenericDocument> {
  const { row, sheet, context } = params;
  const columnMap = new Map(sheet.columns.map((c) => [c.id, c.title]));
  const title = buildRowTitle(row, sheet.columns);
  const content = buildRowContent(row, columnMap);
  const metadata = buildRowMetadata(row, sheet);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = row.createdAt
    ? new Date(row.createdAt).getTime()
    : Date.now();
  const updatedAt = row.modifiedAt
    ? new Date(row.modifiedAt).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_row_${sheet.id}_${row.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(row.id),
    document_type: "row",
    document_subtype: sheet.name,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartsheet",
    url: buildSmartsheetRowUrl(sheet.permalink, row.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
