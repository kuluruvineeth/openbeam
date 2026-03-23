import type { PipedriveTransformContext } from "@openbeam/types/services/connectors/pipedrive";
import type { GenericDocument } from "@openbeam/vespa";
import type { PipedriveOrganization } from "../api/organizations";
import { buildPipedriveUrl } from "./utils";

export function transformPipedriveOrganization(
  org: PipedriveOrganization,
  context: PipedriveTransformContext
): GenericDocument {
  const parts = [
    org.address,
    org.people_count ? `People: ${org.people_count}` : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(org.add_time).getTime();
  const updatedAt = new Date(org.update_time).getTime();

  return {
    id: `${context.connectorId}_organization_${org.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(org.id),
    document_type: "organization",
    document_subtype: "company",
    title: org.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildPipedriveUrl(context.companyDomain, "organization", org.id),
    author_name: org.owner_id?.name,
    author_email: org.owner_id?.email,
    is_public: false,
    access_control: [],
    metadata: {
      ...(org.address && { address: org.address }),
      ...(org.address_country && { country: org.address_country }),
      peopleCount: String(org.people_count),
    },
  };
}
