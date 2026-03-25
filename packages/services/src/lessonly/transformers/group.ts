import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LessonlyGroup } from "../api/groups";
import { buildLessonlyUrl } from "./utils";

function buildGroupContent(group: LessonlyGroup): string {
  const parts: string[] = [];

  if (group.description) {
    parts.push(group.description);
  }

  parts.push(`Members: ${group.members_count}`);

  return parts.join("\n");
}

export async function transformGroup(
  group: LessonlyGroup,
  context: LessonlyTransformContext
): Promise<GenericDocument> {
  const title = group.name;
  const content = buildGroupContent(group);
  const url = buildLessonlyUrl(context.subdomain, `/groups/${group.id}`);

  const metadata: GenericDocument["metadata"] = {
    membersCount: String(group.members_count),
    ...(group.archived_at && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_group_${group.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(group.id),
    document_type: "resource",
    document_subtype: "group",
    title,
    content,
    created_at: new Date(group.created_at).getTime(),
    updated_at: new Date(group.updated_at).getTime(),
    source_type: "lessonly",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
