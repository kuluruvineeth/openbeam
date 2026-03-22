import type { IntercomTransformContext } from "@openbeam/types/services/connectors/intercom";
import type { GenericDocument } from "@openbeam/vespa";
import type { IntercomContact } from "../api/contacts";

export function transformIntercomContact(
  contact: IntercomContact,
  context: IntercomTransformContext
): GenericDocument {
  const name = contact.name ?? contact.email ?? `Contact ${contact.id}`;
  const companies =
    contact.companies?.data.map((c) => c.name).filter(Boolean) ?? [];

  const contentParts = [
    contact.role !== "user" ? `Role: ${contact.role}` : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    companies.length > 0 ? `Company: ${companies.join(", ")}` : null,
    contact.location?.city
      ? `Location: ${[contact.location.city, contact.location.country].filter(Boolean).join(", ")}`
      : null,
  ].filter(Boolean);

  const createdAt = contact.created_at * 1000;
  const updatedAt = contact.updated_at * 1000;

  return {
    id: `${context.connectorId}_contact_${contact.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: contact.id,
    document_type: "contact",
    document_subtype: contact.role,
    title: name,
    content: contentParts.join(" | "),
    author_name: contact.name ?? undefined,
    author_email: contact.email ?? undefined,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `https://app.intercom.com/a/apps/${context.appId ?? "default"}/users/${contact.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      role: contact.role,
      ...(contact.email && { email: contact.email }),
      ...(companies.length > 0 && { companies: companies.join(", ") }),
    },
  };
}
