import type { LessonlyTransformContext } from "@openbeam/types/services/connectors/lessonly";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LessonlyUser } from "../api/users";
import { buildLessonlyUrl } from "./utils";

function buildUserContent(user: LessonlyUser): string {
  const parts: string[] = [];

  parts.push(`Role: ${user.role}`);

  if (user.email) {
    parts.push(`Email: ${user.email}`);
  }

  if (user.groups.length > 0) {
    parts.push(`Groups: ${user.groups.map((g) => g.name).join(", ")}`);
  }

  const customFields = Object.entries(user.custom_user_field_data).filter(
    ([, v]) => v !== null
  );
  if (customFields.length > 0) {
    for (const [key, value] of customFields) {
      parts.push(`${key}: ${String(value)}`);
    }
  }

  return parts.join("\n");
}

export async function transformUser(
  user: LessonlyUser,
  context: LessonlyTransformContext
): Promise<GenericDocument> {
  const title = user.name;
  const content = buildUserContent(user);
  const url = buildLessonlyUrl(context.subdomain, `/users/${user.id}`);

  const metadata: GenericDocument["metadata"] = {
    email: user.email,
    role: user.role,
    ...(user.groups.length > 0 && {
      groups: user.groups.map((g) => g.name).join(", "),
    }),
    ...(user.archived_at && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_user_${user.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(user.id),
    document_type: "resource",
    document_subtype: "user",
    title,
    content,
    created_at: new Date(user.created_at).getTime(),
    updated_at: new Date(user.updated_at).getTime(),
    source_type: "lessonly",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: user.name,
  };
}
