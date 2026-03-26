import type { ShowpadTransformContext } from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import type { ShowpadExperience } from "../client";

function buildExperienceUrl(subdomain: string, experienceId: string): string {
  return `https://${subdomain}.showpad.biz/#!/experience/${experienceId}`;
}

export function transformShowpadExperience(
  experience: ShowpadExperience,
  context: ShowpadTransformContext
): GenericDocument {
  const createdAt = new Date(experience.createdAt).getTime();
  const updatedAt = new Date(experience.updatedAt).getTime();

  const contentParts = [experience.name];
  if (experience.status) {
    contentParts.push(experience.status);
  }
  if (experience.createdBy) {
    const creatorName = [
      experience.createdBy.firstName,
      experience.createdBy.lastName,
    ]
      .filter(Boolean)
      .join(" ");
    if (creatorName) {
      contentParts.push(creatorName);
    }
  }

  const author = experience.createdBy
    ? [experience.createdBy.firstName, experience.createdBy.lastName]
        .filter(Boolean)
        .join(" ") || experience.createdBy.email
    : undefined;

  return {
    id: `${context.connectorId}_experience_${experience.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: experience.id,
    document_type: "presentation",
    document_subtype: "experience",
    title: experience.name,
    content: contentParts.join(" "),
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildExperienceUrl(context.subdomain, experience.id),
    author_name: author,
    is_public: false,
    access_control: [],
    metadata: {
      ...(experience.status && { status: experience.status }),
      ...(experience.createdBy?.email && {
        createdByEmail: experience.createdBy.email,
      }),
    },
  };
}
