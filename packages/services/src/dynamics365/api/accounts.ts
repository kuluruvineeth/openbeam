import type { Dynamics365Client } from "../client";

export type Dynamics365Account = {
  accountid: string;
  name: string;
  description: string | null;
  revenue: number | null;
  industrycode: number | null;
  telephone1: string | null;
  emailaddress1: string | null;
  websiteurl: string | null;
  address1_city: string | null;
  address1_stateorprovince: string | null;
  address1_country: string | null;
  numberofemployees: number | null;
  statecode: number;
  statuscode: number;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  createdon: string;
  modifiedon: string;
};

const ACCOUNT_SELECT = [
  "accountid",
  "name",
  "description",
  "revenue",
  "industrycode",
  "telephone1",
  "emailaddress1",
  "websiteurl",
  "address1_city",
  "address1_stateorprovince",
  "address1_country",
  "numberofemployees",
  "statecode",
  "statuscode",
  "_ownerid_value",
  "createdon",
  "modifiedon",
].join(",");

export function listAllAccounts(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Account[], void, undefined> {
  const params: Record<string, string> = {
    $select: ACCOUNT_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Account>("/accounts", params);
}
