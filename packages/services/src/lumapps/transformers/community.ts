import type { LumAppsTransformContext } from "@openbeam/types/services/connectors/lumapps";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LumAppsCommunity } from "../api/communities";
import { buildLumAppsCommunityUrl } from "./utils";

function buildCommunityContent(community: LumAppsCommunity): string {
  const parts: string[] = [];

  if (community.description) {
    parts.push(community.description);
  }

  parts.push(`Privacy: ${community.privacy}`);

  if (community.memberCount !== undefined) {
    parts.push(`Members: ${community.memberCount}`);
  }

  return parts.join("\n");
}

function buildCommunityMetadata(
  community: LumAppsCommunity
): GenericDocument["metadata"] {
  return {
    communityId: community.id,
    privacy: community.privacy,
    ...(community.memberCount !== undefined && {
      memberCount: community.memberCount,
    }),
  };
}

export async function transformCommunity(
  community: LumAppsCommunity,
  context: LumAppsTransformContext
): Promise<GenericDocument> {
  const title = community.name;
  const content = buildCommunityContent(community);
  const metadata = buildCommunityMetadata(community);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(community.createdAt).getTime();
  const updatedAt = new Date(community.updatedAt).getTime();

  return {
    id: `${context.connectorId}_community_${community.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: community.id,
    document_type: "community",
    document_subtype: community.privacy,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "lumapps",
    url: buildLumAppsCommunityUrl(community.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
