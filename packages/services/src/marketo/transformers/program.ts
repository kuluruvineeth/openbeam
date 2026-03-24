import type { MarketoTransformContext } from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import type { MarketoProgram } from "../api/programs";
import { buildMarketoUrl } from "./utils";

export function transformMarketoProgram(
  program: MarketoProgram,
  context: MarketoTransformContext
): GenericDocument {
  const parts = [
    program.description ?? null,
    program.type ? `Type: ${program.type}` : null,
    program.channel ? `Channel: ${program.channel}` : null,
    program.status ? `Status: ${program.status}` : null,
    program.workspace ? `Workspace: ${program.workspace}` : null,
    program.folder?.folderName ? `Folder: ${program.folder.folderName}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(program.createdAt).getTime();
  const updatedAt = new Date(program.updatedAt).getTime();

  return {
    id: `${context.connectorId}_program_${program.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(program.id),
    document_type: "program",
    document_subtype: program.type,
    title: program.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: program.url ?? buildMarketoUrl(context.munchkinId, "PG", program.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(program.type && { programType: program.type }),
      ...(program.channel && { channel: program.channel }),
      ...(program.status && { status: program.status }),
      ...(program.workspace && { workspace: program.workspace }),
    },
  };
}
