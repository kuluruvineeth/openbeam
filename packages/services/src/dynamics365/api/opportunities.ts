import type { Dynamics365Client } from "../client";

export type Dynamics365Opportunity = {
  opportunityid: string;
  name: string;
  description: string | null;
  estimatedvalue: number | null;
  actualvalue: number | null;
  estimatedclosedate: string | null;
  actualclosedate: string | null;
  closeprobability: number | null;
  stepname: string | null;
  statuscode: number;
  statecode: number;
  _parentaccountid_value: string | null;
  "_parentaccountid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _parentcontactid_value: string | null;
  "_parentcontactid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  transactioncurrencyid?: { isocurrencycode?: string };
  createdon: string;
  modifiedon: string;
};

const OPPORTUNITY_SELECT = [
  "opportunityid",
  "name",
  "description",
  "estimatedvalue",
  "actualvalue",
  "estimatedclosedate",
  "actualclosedate",
  "closeprobability",
  "stepname",
  "statuscode",
  "statecode",
  "_parentaccountid_value",
  "_parentcontactid_value",
  "_ownerid_value",
  "createdon",
  "modifiedon",
].join(",");

export function listAllOpportunities(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Opportunity[], void, undefined> {
  const params: Record<string, string> = {
    $select: OPPORTUNITY_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Opportunity>("/opportunities", params);
}
