import type { NiceCxoneTransformContext } from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import type { CxoneContact } from "../api/contacts";
import { buildCxoneUrl, formatDuration } from "./utils";

export function transformCxoneContact(
  contact: CxoneContact,
  context: NiceCxoneTransformContext
): GenericDocument {
  const agentName =
    contact.firstName && contact.lastName
      ? `${contact.firstName} ${contact.lastName}`
      : undefined;

  const parts = [
    contact.direction ? `Direction: ${contact.direction}` : null,
    contact.mediaType ? `Media: ${contact.mediaType}` : null,
    contact.skillName ? `Skill: ${contact.skillName}` : null,
    agentName ? `Agent: ${agentName}` : null,
    contact.teamName ? `Team: ${contact.teamName}` : null,
    contact.primaryDispositionName
      ? `Disposition: ${contact.primaryDispositionName}`
      : null,
    formatDuration(contact.totalDuration)
      ? `Duration: ${formatDuration(contact.totalDuration)}`
      : null,
    contact.dispositionNotes ? `Notes: ${contact.dispositionNotes}` : null,
    contact.tags ? `Tags: ${contact.tags}` : null,
  ].filter(Boolean);

  const title = [
    `Contact #${contact.contactId}`,
    contact.skillName ? ` - ${contact.skillName}` : "",
    contact.direction ? ` (${contact.direction})` : "",
  ].join("");

  return {
    id: `${context.connectorId}_contact_${contact.contactId}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(contact.contactId),
    document_type: "contact",
    document_subtype: contact.mediaType ?? contact.direction,
    title,
    content: parts.join(" — "),
    created_at: new Date(contact.contactStart).getTime(),
    updated_at: contact.lastUpdateTime
      ? new Date(contact.lastUpdateTime).getTime()
      : new Date(contact.contactEnd ?? contact.contactStart).getTime(),
    url: buildCxoneUrl(context.baseUrl, "contacts", contact.contactId),
    author_name: agentName,
    is_public: false,
    access_control: [],
    metadata: {
      ...(contact.contactId && { contactId: String(contact.contactId) }),
      ...(contact.direction && { direction: contact.direction }),
      ...(contact.mediaType && { mediaType: contact.mediaType }),
      ...(contact.skillName && { skillName: contact.skillName }),
      ...(contact.primaryDispositionName && {
        disposition: contact.primaryDispositionName,
      }),
      ...(contact.totalDuration !== undefined && {
        durationSeconds: String(contact.totalDuration),
      }),
      ...(contact.abandoned !== undefined && {
        abandoned: String(contact.abandoned),
      }),
    },
  };
}
