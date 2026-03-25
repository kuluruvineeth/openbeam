import type { LumAppsTransformContext } from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LumAppsSpace } from "../api/spaces";
import { buildLumAppsSpaceUrl } from "./utils";

function buildSpaceContent(space: LumAppsSpace): string {
  const parts: string[] = [];

  if (space.description) {
    parts.push(space.description);
  }

  parts.push(`Visibility: ${space.visibility}`);

  return parts.join("\n");
}

function buildSpaceMetadata(space: LumAppsSpace): GenericDocument["metadata"] {
  return {
    spaceId: space.id,
    visibility: space.visibility,
  };
}

export async function transformSpace(
  space: LumAppsSpace,
  context: LumAppsTransformContext
): Promise<GenericDocument> {
  const title = space.name;
  const content = buildSpaceContent(space);
  const metadata = buildSpaceMetadata(space);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(space.createdAt).getTime();
  const updatedAt = new Date(space.updatedAt).getTime();

  return {
    id: `${context.connectorId}_space_${space.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: space.id,
    document_type: "space",
    document_subtype: space.visibility,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "lumapps",
    url: buildLumAppsSpaceUrl(space.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
