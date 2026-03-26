import type { SmartsheetTransformContext } from "@openbeam/types/services/connectors/smartsheet";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SmartsheetWorkspace } from "../api/workspaces";
import { formatAccessLevel } from "./utils";

function buildWorkspaceContent(ws: SmartsheetWorkspace): string {
  const parts: string[] = [];

  parts.push(`Access: ${formatAccessLevel(ws.accessLevel)}`);

  if (ws.sheets?.length) {
    parts.push(
      `Sheets (${ws.sheets.length}): ${ws.sheets.map((s) => s.name).join(", ")}`
    );
  }

  if (ws.reports?.length) {
    parts.push(
      `Reports (${ws.reports.length}): ${ws.reports.map((r) => r.name).join(", ")}`
    );
  }

  if (ws.sights?.length) {
    parts.push(
      `Dashboards (${ws.sights.length}): ${ws.sights.map((s) => s.name).join(", ")}`
    );
  }

  if (ws.folders?.length) {
    parts.push(
      `Folders (${ws.folders.length}): ${ws.folders.map((f) => f.name).join(", ")}`
    );
  }

  return parts.join("\n");
}

function buildWorkspaceMetadata(
  ws: SmartsheetWorkspace
): GenericDocument["metadata"] {
  return {
    workspaceId: String(ws.id),
    accessLevel: ws.accessLevel,
    ...(ws.sheets?.length && { sheetCount: ws.sheets.length }),
    ...(ws.reports?.length && { reportCount: ws.reports.length }),
    ...(ws.sights?.length && { dashboardCount: ws.sights.length }),
    ...(ws.folders?.length && { folderCount: ws.folders.length }),
  };
}

export async function transformWorkspace(
  ws: SmartsheetWorkspace,
  context: SmartsheetTransformContext
): Promise<GenericDocument> {
  const title = ws.name;
  const content = buildWorkspaceContent(ws);
  const metadata = buildWorkspaceMetadata(ws);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_workspace_${ws.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(ws.id),
    document_type: "workspace",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "smartsheet",
    url: ws.permalink,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
