import type { HubSpotTransformContext } from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HubSpotContact } from "../api/contacts";

const PORTAL_URL = "https://app.hubspot.com/contacts";

export function transformHubSpotContact(
  contact: HubSpotContact,
  context: HubSpotTransformContext
): GenericDocument {
  const p = contact.properties;
  const name =
    [p.firstname, p.lastname].filter(Boolean).join(" ") || contact.id;

  const parts = [
    p.jobtitle,
    p.company ? `at ${p.company}` : null,
    p.lifecyclestage,
  ].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(contact.createdAt).getTime();
  const updatedAt = new Date(contact.updatedAt).getTime();

  return {
    id: `${context.connectorId}_contact_${contact.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: contact.id,
    document_type: "contact",
    document_subtype: "contact",
    title: name,
    content,
    author_email: p.email,
    author_name: name,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${PORTAL_URL}/${context.portalId}/contact/${contact.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(p.email && { email: p.email }),
      ...(p.phone && { phone: p.phone }),
      ...(p.jobtitle && { jobTitle: p.jobtitle }),
      ...(p.company && { company: p.company }),
      ...(p.lifecyclestage && { lifecycleStage: p.lifecyclestage }),
    },
  };
}
