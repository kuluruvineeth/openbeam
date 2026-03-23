import type { Dynamics365TransformContext } from "@openbeam/types/services/connectors/dynamics365";
import type { GenericDocument } from "@openbeam/vespa";
import type { Dynamics365Account } from "../api/accounts";
import { buildDynamics365Url } from "./utils";

export function transformDynamics365Account(
  account: Dynamics365Account,
  context: Dynamics365TransformContext
): GenericDocument {
  const parts = [
    account.description,
    account.telephone1 ? `Phone: ${account.telephone1}` : null,
    account.emailaddress1 ? `Email: ${account.emailaddress1}` : null,
    account.websiteurl ? `Website: ${account.websiteurl}` : null,
    account.address1_city ? `Location: ${account.address1_city}` : null,
    account.revenue ? `Revenue: ${account.revenue}` : null,
    account.numberofemployees
      ? `Employees: ${account.numberofemployees}`
      : null,
  ].filter(Boolean);

  const content = parts.join(" — ");
  const createdAt = new Date(account.createdon).getTime();
  const updatedAt = new Date(account.modifiedon).getTime();
  const ownerName = (account as Record<string, unknown>)[
    "_ownerid_value@OData.Community.Display.V1.FormattedValue"
  ] as string | undefined;

  return {
    id: `${context.connectorId}_account_${account.accountid}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: account.accountid,
    document_type: "account",
    title: account.name,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildDynamics365Url(context.orgUrl, "account", account.accountid),
    author_name: ownerName,
    is_public: false,
    access_control: [],
    metadata: {
      ...(account.telephone1 && { phone: account.telephone1 }),
      ...(account.emailaddress1 && { email: account.emailaddress1 }),
      ...(account.websiteurl && { website: account.websiteurl }),
      ...(account.address1_city && { city: account.address1_city }),
      ...(account.address1_country && { country: account.address1_country }),
      ...(account.revenue && { revenue: String(account.revenue) }),
      ...(account.numberofemployees && {
        employees: String(account.numberofemployees),
      }),
      active: String(account.statecode === 0),
    },
  };
}
