import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InteractSpace } from "../api/spaces";

function buildSpaceContent(space: InteractSpace): string {
  const parts: string[] = [];

  parts.push(space.Name);

  if (space.Description) {
    parts.push(space.Description);
  }

  if (space.Type) {
    parts.push(`Type: ${space.Type}`);
  }

  if (space.MemberCount !== undefined) {
    parts.push(`Members: ${space.MemberCount}`);
  }

  if (space.Owner) {
    parts.push(`Owner: ${space.Owner.DisplayName}`);
  }

  return parts.join("\n");
}

export async function transformSpace(
  space: InteractSpace,
  context: InteractTransformContext
): Promise<GenericDocument> {
  const title = space.Name;
  const content = buildSpaceContent(space);
  const metadata: GenericDocument["metadata"] = {
    ...(space.Type && { spaceType: space.Type }),
    ...(space.MemberCount !== undefined && {
      memberCount: String(space.MemberCount),
    }),
    ...(space.Owner && { owner: space.Owner.DisplayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_space_${space.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: space.Id,
    document_type: "space",
    document_subtype: space.Type ?? "community",
    title,
    content,
    url: space.Url ?? `${context.instanceUrl}/spaces/${space.Id}`,
    created_at: new Date(space.CreatedDate).getTime(),
    updated_at: new Date(space.ModifiedDate).getTime(),
    source_type: "interact",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: space.Owner?.DisplayName,
    author_email: space.Owner?.Email,
  };
}
