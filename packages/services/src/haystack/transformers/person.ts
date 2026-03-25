import type { HaystackTransformContext } from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { HaystackPerson } from "../api/people";

function buildPersonContent(person: HaystackPerson): string {
  const parts: string[] = [];

  const fullName = `${person.first_name} ${person.last_name}`;
  parts.push(fullName);

  if (person.title) {
    parts.push(`Title: ${person.title}`);
  }

  if (person.department) {
    parts.push(`Department: ${person.department.name}`);
  }

  if (person.team) {
    parts.push(`Team: ${person.team.name}`);
  }

  if (person.manager) {
    parts.push(
      `Manager: ${person.manager.first_name} ${person.manager.last_name}`
    );
  }

  if (person.location) {
    const locationParts = [person.location.name];
    if (person.location.city) {
      locationParts.push(person.location.city);
    }
    if (person.location.country) {
      locationParts.push(person.location.country);
    }
    parts.push(`Location: ${locationParts.join(", ")}`);
  }

  parts.push(`Email: ${person.email}`);

  if (person.phone) {
    parts.push(`Phone: ${person.phone}`);
  }

  if (person.bio) {
    parts.push(person.bio);
  }

  if (person.start_date) {
    parts.push(`Start Date: ${person.start_date}`);
  }

  if (person.pronouns) {
    parts.push(`Pronouns: ${person.pronouns}`);
  }

  return parts.join("\n");
}

export async function transformPerson(
  person: HaystackPerson,
  context: HaystackTransformContext
): Promise<GenericDocument> {
  const title = `${person.first_name} ${person.last_name}`;
  const content = buildPersonContent(person);
  const metadata: GenericDocument["metadata"] = {
    email: person.email,
    status: person.status,
    ...(person.title && { title: person.title }),
    ...(person.department && { department: person.department.name }),
    ...(person.team && { team: person.team.name }),
    ...(person.manager && {
      manager: `${person.manager.first_name} ${person.manager.last_name}`,
    }),
    ...(person.location && { location: person.location.name }),
    ...(person.phone && { phone: person.phone }),
    ...(person.pronouns && { pronouns: person.pronouns }),
    ...(person.start_date && { startDate: person.start_date }),
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
    document_subtype: person.status,
    title,
    content,
    created_at: new Date(person.created_at).getTime(),
    updated_at: new Date(person.updated_at).getTime(),
    source_type: "haystack",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: title,
    author_email: person.email,
  };
}
