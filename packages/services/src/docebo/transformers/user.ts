import type { DoceboTransformContext } from "@openbeam/types/services/connectors/docebo";
import type { GenericDocument } from "@openbeam/vespa";
import type { DoceboUser } from "../api/users";
import { buildDoceboUrl } from "./utils";

export function transformDoceboUser(
  user: DoceboUser,
  context: DoceboTransformContext
): GenericDocument {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  const parts = [
    fullName ? `Name: ${fullName}` : null,
    user.email ? `Email: ${user.email}` : null,
    user.role ? `Role: ${user.role}` : null,
    user.status ? `Status: ${user.status}` : null,
    user.branch_name ? `Branch: ${user.branch_name}` : null,
    user.language ? `Language: ${user.language}` : null,
  ].filter(Boolean);

  return {
    id: `${context.connectorId}_user_${user.user_id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(user.user_id),
    document_type: "user",
    document_subtype: user.role,
    title: fullName || user.username,
    content: parts.join(" — "),
    created_at: new Date(user.date_creation).getTime(),
    updated_at: new Date(user.date_last_updated).getTime(),
    url: buildDoceboUrl(context.instanceUrl, "user", user.user_id),
    author_name: fullName || undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(user.username && { username: user.username }),
      ...(user.role && { role: user.role }),
      ...(user.status && { status: user.status }),
      ...(user.branch_name && { branch: user.branch_name }),
      ...(user.email && { email: user.email }),
    },
  };
}
