import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AhaInitiative } from "../api/initiatives";
import { stripHtml } from "./utils";

function buildInitiativeContent(initiative: AhaInitiative): string {
  const parts: string[] = [];

  if (initiative.description?.body) {
    parts.push(stripHtml(initiative.description.body));
  }

  parts.push(`Status: ${initiative.status}`);
  parts.push(`Progress: ${Math.round(initiative.progress)}%`);

  if (initiative.effort) {
    parts.push(`Effort: ${initiative.effort.text}`);
  }

  if (initiative.value) {
    parts.push(`Value: ${initiative.value.text}`);
  }

  return parts.join("\n");
}

export async function transformInitiative(
  initiative: AhaInitiative,
  context: AhaTransformContext
): Promise<GenericDocument> {
  const title = initiative.name;
  const content = buildInitiativeContent(initiative);
  const metadata: GenericDocument["metadata"] = {
    status: initiative.status,
    color: initiative.color,
    progress: String(Math.round(initiative.progress)),
    ...(initiative.effort && { effort: initiative.effort.text }),
    ...(initiative.value && { value: initiative.value.text }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_initiative_${initiative.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: initiative.id,
    document_type: "initiative",
    document_subtype: initiative.status,
    title,
    content,
    created_at: new Date(initiative.created_at).getTime(),
    updated_at: new Date(initiative.updated_at).getTime(),
    source_type: "aha",
    url: initiative.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
