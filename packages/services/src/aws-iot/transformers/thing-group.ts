import type { AwsIotTransformContext } from "@openplane/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openplane/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AwsIotThingGroupDetail } from "../client";

function buildThingGroupContent(group: AwsIotThingGroupDetail): string {
  const parts: string[] = [];

  if (group.description) {
    parts.push(group.description);
  }

  if (group.parentGroupName) {
    parts.push(`Parent: ${group.parentGroupName}`);
  }

  if (group.rootToParentGroups?.length) {
    const hierarchy = group.rootToParentGroups
      .map((g) => g.groupName)
      .join(" > ");
    parts.push(`Hierarchy: ${hierarchy}`);
  }

  if (group.attributes) {
    const attrs = Object.entries(group.attributes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    if (attrs) {
      parts.push(`Attributes: ${attrs}`);
    }
  }

  return parts.join("\n");
}

function buildThingGroupMetadata(
  group: AwsIotThingGroupDetail
): GenericDocument["metadata"] {
  return {
    groupName: group.groupName,
    ...(group.groupId && { groupId: group.groupId }),
    ...(group.version != null && { version: group.version }),
    ...(group.description && { description: group.description }),
    ...(group.parentGroupName && { parentGroup: group.parentGroupName }),
    ...(group.attributes && { attributes: group.attributes }),
    ...(group.rootToParentGroups?.length && {
      hierarchyDepth: group.rootToParentGroups.length,
    }),
  };
}

export async function transformThingGroup(
  group: AwsIotThingGroupDetail,
  context: AwsIotTransformContext
): Promise<GenericDocument> {
  const title = group.groupName;
  const content = buildThingGroupContent(group);
  const metadata = buildThingGroupMetadata(group);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();
  const createdAt = group.creationDate ? group.creationDate * 1000 : now;

  const consoleUrl = `https://${context.region}.console.aws.amazon.com/iot/home?region=${context.region}#/thinggroup/${encodeURIComponent(group.groupName)}`;

  return {
    id: `${context.connectorId}_thinggroup_${group.groupName}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: group.groupName,
    document_type: "device_group",
    document_subtype: "thing_group",
    title,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    source_type: "aws-iot",
    url: consoleUrl,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformThingGroups(
  groups: AwsIotThingGroupDetail[],
  context: AwsIotTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(
    groups.map((group) => transformThingGroup(group, context))
  );
}
