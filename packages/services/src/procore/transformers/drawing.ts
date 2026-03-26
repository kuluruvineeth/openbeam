import type { ProcoreTransformContext } from "@openbeam/types/services/connectors/procore";
import type { GenericDocument } from "@openbeam/vespa";
import type { ProcoreDrawing } from "../api/drawings";
import { buildProcoreUrl } from "./utils";

export function transformProcoreDrawing(
  drawing: ProcoreDrawing,
  projectId: number,
  context: ProcoreTransformContext
): GenericDocument {
  const parts = [
    drawing.description,
    drawing.discipline ? `Discipline: ${drawing.discipline}` : null,
    drawing.set ? `Set: ${drawing.set.name}` : null,
    `Revision: ${drawing.revision_number}`,
    drawing.current ? "Current" : "Superseded",
    drawing.received_date ? `Received: ${drawing.received_date}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(drawing.created_at).getTime();
  const updatedAt = new Date(drawing.updated_at).getTime();

  return {
    id: `${context.connectorId}_drawing_${drawing.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(drawing.id),
    document_type: "drawing",
    document_subtype: drawing.discipline ?? undefined,
    title: drawing.title
      ? `${drawing.number} - ${drawing.title}`
      : drawing.number,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildProcoreUrl(projectId, "drawings", drawing.id),
    is_public: false,
    access_control: [],
    metadata: {
      drawingNumber: drawing.number,
      revision: String(drawing.revision_number),
      current: String(drawing.current),
      ...(drawing.discipline && { discipline: drawing.discipline }),
      ...(drawing.set && { set: drawing.set.name }),
      projectId: String(projectId),
    },
  };
}
