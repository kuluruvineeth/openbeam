import type { Dynamics365Client } from "../client";

export type Dynamics365Lead = {
  leadid: string;
  fullname: string;
  firstname: string | null;
  lastname: string | null;
  subject: string | null;
  emailaddress1: string | null;
  telephone1: string | null;
  companyname: string | null;
  jobtitle: string | null;
  description: string | null;
  leadsourcecode: number | null;
  leadqualitycode: number | null;
  estimatedvalue: number | null;
  statuscode: number;
  statecode: number;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  createdon: string;
  modifiedon: string;
};

const LEAD_SELECT = [
  "leadid",
  "fullname",
  "firstname",
  "lastname",
  "subject",
  "emailaddress1",
  "telephone1",
  "companyname",
  "jobtitle",
  "description",
  "leadsourcecode",
  "leadqualitycode",
  "estimatedvalue",
  "statuscode",
  "statecode",
  "_ownerid_value",
  "createdon",
  "modifiedon",
].join(",");

export function listAllLeads(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Lead[], void, undefined> {
  const params: Record<string, string> = {
    $select: LEAD_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Lead>("/leads", params);
}
