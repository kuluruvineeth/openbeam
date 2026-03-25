import type { InteractTransformContext } from "@openbeam/types/services/connectors/interact";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { InteractPerson } from "../api/people";

function buildPersonContent(person: InteractPerson): string {
  const parts: string[] = [];

  parts.push(person.DisplayName);

  if (person.JobTitle) {
    parts.push(`Title: ${person.JobTitle}`);
  }

  if (person.Department) {
    parts.push(`Department: ${person.Department}`);
  }

  if (person.Location) {
    parts.push(`Location: ${person.Location}`);
  }

  if (person.Manager) {
    parts.push(`Manager: ${person.Manager.DisplayName}`);
  }

  parts.push(`Email: ${person.Email}`);

  if (person.Phone) {
    parts.push(`Phone: ${person.Phone}`);
  }

  if (person.Bio) {
    parts.push(person.Bio);
  }

  return parts.join("\n");
}

export async function transformPerson(
  person: InteractPerson,
  context: InteractTransformContext
): Promise<GenericDocument> {
  const title = person.DisplayName;
  const content = buildPersonContent(person);
  const metadata: GenericDocument["metadata"] = {
    email: person.Email,
    status: person.Status,
    ...(person.JobTitle && { jobTitle: person.JobTitle }),
    ...(person.Department && { department: person.Department }),
    ...(person.Location && { location: person.Location }),
    ...(person.Manager && { manager: person.Manager.DisplayName }),
    ...(person.Phone && { phone: person.Phone }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_person_${person.Id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: person.Id,
    document_type: "person",
    document_subtype: person.Status,
    title,
    content,
    created_at: new Date(person.CreatedDate).getTime(),
    updated_at: new Date(person.ModifiedDate).getTime(),
    source_type: "interact",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: title,
    author_email: person.Email,
  };
}
