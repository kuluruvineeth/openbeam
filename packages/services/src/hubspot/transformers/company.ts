import type { HubSpotTransformContext } from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import type { HubSpotCompany } from "../api/companies";

const PORTAL_URL = "https://app.hubspot.com/contacts";

export function transformHubSpotCompany(
  company: HubSpotCompany,
  context: HubSpotTransformContext
): GenericDocument {
  const p = company.properties;
  const name = p.name || company.id;

  const parts = [p.description, p.industry, p.domain].filter(Boolean);
  const content = parts.join(" — ");

  const createdAt = new Date(company.createdAt).getTime();
  const updatedAt = new Date(company.updatedAt).getTime();

  return {
    id: `${context.connectorId}_company_${company.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: company.id,
    document_type: "company",
    document_subtype: (p.industry ?? "company").toLowerCase(),
    title: name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: `${PORTAL_URL}/${context.portalId}/company/${company.id}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(p.domain && { domain: p.domain }),
      ...(p.industry && { industry: p.industry }),
      ...(p.website && { website: p.website }),
      ...(p.phone && { phone: p.phone }),
      ...(p.city && { city: p.city }),
      ...(p.state && { state: p.state }),
      ...(p.country && { country: p.country }),
      ...(p.numberofemployees && {
        employees: Number(p.numberofemployees),
      }),
    },
  };
}
