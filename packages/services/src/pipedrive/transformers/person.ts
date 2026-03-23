import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import type { PipedrivePerson } from "../api/persons";
import { buildPipedriveUrl } from "./utils";

export function transformPipedrivePerson(
  person: PipedrivePerson,
  context: PipedriveTransformContext
): GenericDocument {
  const primaryEmail =
    person.email.find((e) => e.primary)?.value ?? person.email[0]?.value;
  const primaryPhone =
    person.phone.find((p) => p.primary)?.value ?? person.phone[0]?.value;

  const parts = [
    primaryEmail ? `Email: ${primaryEmail}` : null,
    primaryPhone ? `Phone: ${primaryPhone}` : null,
    person.org_id ? `Organization: ${person.org_id.name}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(person.add_time).getTime();
  const updatedAt = new Date(person.update_time).getTime();

  return {
    id: `${context.connectorId}_person_${person.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(person.id),
    document_type: "person",
    title: person.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildPipedriveUrl(context.companyDomain, "person", person.id),
    author_name: person.owner_id?.name,
    author_email: person.owner_id?.email,
    is_public: false,
    access_control: [],
    metadata: {
      ...(primaryEmail && { email: primaryEmail }),
      ...(primaryPhone && { phone: primaryPhone }),
      ...(person.org_id && { organizationName: person.org_id.name }),
    },
  };
}
