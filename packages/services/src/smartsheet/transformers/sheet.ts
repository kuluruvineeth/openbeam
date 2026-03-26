import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartsheetSheet } from "../api/sheets";
import { formatAccessLevel } from "./utils";

function buildSheetContent(sheet: SmartsheetSheet): string {
  const parts: string[] = [];

  if (sheet.columns?.length) {
    const columnNames = sheet.columns.map((c) => c.title).join(", ");
    parts.push(`Columns: ${columnNames}`);
  }

  if (sheet.totalRowCount !== undefined) {
    parts.push(`Row count: ${sheet.totalRowCount}`);
  }

  parts.push(`Access: ${formatAccessLevel(sheet.accessLevel)}`);

  if (sheet.owner) {
    parts.push(`Owner: ${sheet.owner}`);
  }

  if (sheet.workspace) {
    parts.push(`Workspace: ${sheet.workspace.name}`);
  }

  if (sheet.version !== undefined) {
    parts.push(`Version: ${sheet.version}`);
  }

  return parts.join("\n");
}

function buildSheetMetadata(
  sheet: SmartsheetSheet
): GenericDocument["metadata"] {
  return {
    sheetId: String(sheet.id),
    accessLevel: sheet.accessLevel,
    ...(sheet.totalRowCount !== undefined && {
      rowCount: sheet.totalRowCount,
    }),
    ...(sheet.owner && { owner: sheet.owner }),
    ...(sheet.columns?.length && { columnCount: sheet.columns.length }),
    ...(sheet.workspace && { workspaceName: sheet.workspace.name }),
    ...(sheet.version !== undefined && { version: sheet.version }),
  };
}

export async function transformSheet(
  sheet: SmartsheetSheet,
  context: SmartsheetTransformContext
): Promise<GenericDocument> {
  const title = sheet.name;
  const content = buildSheetContent(sheet);
  const metadata = buildSheetMetadata(sheet);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(sheet.createdAt).getTime();
  const updatedAt = new Date(sheet.modifiedAt).getTime();

  return {
    id: `${context.connectorId}_sheet_${sheet.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(sheet.id),
    document_type: "sheet",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "smartsheet",
    url: sheet.permalink,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: sheet.owner,
  };
}
