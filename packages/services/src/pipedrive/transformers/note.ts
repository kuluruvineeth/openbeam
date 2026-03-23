import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import type { PipedriveNote } from "../api/notes";
import { buildPipedriveUrl, stripHtml } from "./utils";

export function transformPipedriveNote(
  note: PipedriveNote,
  context: PipedriveTransformContext
): GenericDocument {
  const plainContent = stripHtml(note.content);
  const title =
    plainContent.length > 80
      ? `${plainContent.substring(0, 80)}...`
      : plainContent || "Untitled Note";

  const createdAt = new Date(note.add_time).getTime();
  const updatedAt = new Date(note.update_time).getTime();

  let linkedEntity = "general";
  if (note.deal_id) {
    linkedEntity = "deal";
  } else if (note.person_id) {
    linkedEntity = "person";
  } else if (note.org_id) {
    linkedEntity = "organization";
  }

  return {
    id: `${context.connectorId}_note_${note.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(note.id),
    document_type: "note",
    document_subtype: linkedEntity,
    title,
    content: plainContent,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildPipedriveUrl(context.companyDomain, "notes", note.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(note.deal_id && { dealId: String(note.deal_id) }),
      ...(note.person_id && { personId: String(note.person_id) }),
      ...(note.org_id && { orgId: String(note.org_id) }),
      linkedEntity,
    },
  };
}
