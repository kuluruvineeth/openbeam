import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SimpplrPerson } from "../api/people";

function buildPersonContent(person: SimpplrPerson): string {
  const parts: string[] = [person.displayName];

  if (person.email) {
    parts.push(`Email: ${person.email}`);
  }

  if (person.jobTitle) {
    parts.push(`Title: ${person.jobTitle}`);
  }

  if (person.department) {
    parts.push(`Department: ${person.department}`);
  }

  if (person.location) {
    parts.push(`Location: ${person.location}`);
  }

  if (person.phone) {
    parts.push(`Phone: ${person.phone}`);
  }

  if (person.manager) {
    parts.push(`Manager: ${person.manager.displayName}`);
  }

  if (person.bio) {
    parts.push(person.bio);
  }

  return parts.join("\n");
}

export async function transformPerson(
  person: SimpplrPerson,
  context: SimpplrTransformContext
): Promise<GenericDocument> {
  const title = person.displayName;
  const content = buildPersonContent(person);
  const metadata: GenericDocument["metadata"] = {
    email: person.email,
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    ...(person.department && { department: person.department }),
    ...(person.location && { location: person.location }),
    ...(person.manager && { manager: person.manager.displayName }),
    ...(person.status && { status: person.status }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_person_${person.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: person.id,
    document_type: "person",
    title,
    content,
    url: person.url ?? `${context.instanceUrl}/people/${person.id}`,
    created_at: new Date(person.createdAt).getTime(),
    updated_at: new Date(person.updatedAt).getTime(),
    source_type: "simpplr",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: person.displayName,
    author_email: person.email,
  };
}
