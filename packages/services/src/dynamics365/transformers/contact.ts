import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Contact } from "../api/contacts";
import { buildDynamics365Url } from "./utils";

export function transformDynamics365Contact(
  contact: Dynamics365Contact,
  context: Dynamics365TransformContext
): GenericDocument {
  const accountName = (contact as Record<string, unknown>)[
    "_parentcustomerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;
  const ownerName = (contact as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  const parts = [
    contact.jobtitle ? `Title: ${contact.jobtitle}` : null,
    contact.emailaddress1 ? `Email: ${contact.emailaddress1}` : null,
    contact.telephone1 ? `Phone: ${contact.telephone1}` : null,
    accountName ? `Account: ${accountName}` : null,
    contact.department ? `Department: ${contact.department}` : null,
    contact.description,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(contact.createdon).getTime();
  const updatedAt = new Date(contact.modifiedon).getTime();

  return {
    id: `${context.connectorId}_contact_${contact.contactid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: contact.contactid,
    document_type: "contact",
    title: contact.fullname,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(context.orgUrl, "contact", contact.contactid),
    author_name: ownerName,
    author_email: contact.emailaddress1 ?? undefined,
    is_public: false,
    access_control: [],
    metadata: {
      ...(contact.emailaddress1 && { email: contact.emailaddress1 }),
      ...(contact.telephone1 && { phone: contact.telephone1 }),
      ...(contact.jobtitle && { jobTitle: contact.jobtitle }),
      ...(contact.department && { department: contact.department }),
      ...(accountName && { accountName }),
      ...(contact.address1_city && { city: contact.address1_city }),
    },
  };
}
