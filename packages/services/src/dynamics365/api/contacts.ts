import type { Dynamics365Client } from "../client";

export type Dynamics365Contact = {
  contactid: string;
  fullname: string;
  firstname: string | null;
  lastname: string | null;
  jobtitle: string | null;
  emailaddress1: string | null;
  telephone1: string | null;
  mobilephone: string | null;
  department: string | null;
  address1_city: string | null;
  address1_stateorprovince: string | null;
  address1_country: string | null;
  description: string | null;
  _parentcustomerid_value: string | null;
  "_parentcustomerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  statecode: number;
  createdon: string;
  modifiedon: string;
};

const CONTACT_SELECT = [
  "contactid",
  "fullname",
  "firstname",
  "lastname",
  "jobtitle",
  "emailaddress1",
  "telephone1",
  "mobilephone",
  "department",
  "address1_city",
  "address1_stateorprovince",
  "address1_country",
  "description",
  "_parentcustomerid_value",
  "_ownerid_value",
  "statecode",
  "createdon",
  "modifiedon",
].join(",");

export function listAllContacts(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Contact[], void, undefined> {
  const params: Record<string, string> = {
    $select: CONTACT_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Contact>("/contacts", params);
}
