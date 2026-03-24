import type { EgnyteTransformContext } from "@openbeam/types/services/connectors/egnyte";
import type { GenericDocument } from "@openbeam/vespa";
import type { EgnyteLink } from "../client";
import { buildEgnyteUrl, getExtension, getSubtypeFromExtension } from "./utils";

function getLinkSubtype(link: EgnyteLink): string {
  if (link.type === "folder") {
    return "folder";
  }
  if (link.type === "upload") {
    return "file";
  }
  const ext = getExtension(link.path);
  return getSubtypeFromExtension(ext);
}

export function transformEgnyteLink(
  link: EgnyteLink,
  context: EgnyteTransformContext
): GenericDocument {
  const fileName = link.path.split("/").pop() ?? link.path;
  const contentParts = [fileName, link.path, link.type, link.accessibility];
  const content = contentParts.join(" ");

  const createdAt = link.creation_date
    ? new Date(link.creation_date).getTime()
    : Date.now();

  const isPublic =
    link.accessibility === "anyone" || link.accessibility === "domain";

  return {
    id: `${context.connectorId}_link_${link.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: link.id,
    document_type: "link",
    document_subtype: getLinkSubtype(link),
    title: fileName,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    url: link.url || buildEgnyteUrl(context.domain, link.path),
    author_name: link.created_by,
    is_public: isPublic,
    access_control: [],
    metadata: {
      path: link.path,
      linkType: link.type,
      accessibility: link.accessibility,
      ...(link.expiry_date && { expiryDate: link.expiry_date }),
      ...(link.recipients &&
        link.recipients.length > 0 && {
          recipients: JSON.stringify(link.recipients),
        }),
      linkToCurrent: link.link_to_current,
    },
  };
}
