import type { Dynamics365Client } from "../client";

export type Dynamics365Case = {
  incidentid: string;
  title: string;
  description: string | null;
  ticketnumber: string;
  prioritycode: number | null;
  severitycode: number | null;
  casetypecode: number | null;
  statuscode: number;
  statecode: number;
  _customerid_value: string | null;
  "_customerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _subjectid_value: string | null;
  createdon: string;
  modifiedon: string;
  resolvedon: string | null;
};

const CASE_SELECT = [
  "incidentid",
  "title",
  "description",
  "ticketnumber",
  "prioritycode",
  "severitycode",
  "casetypecode",
  "statuscode",
  "statecode",
  "_customerid_value",
  "_ownerid_value",
  "_subjectid_value",
  "createdon",
  "modifiedon",
  "resolvedon",
].join(",");

export function listAllCases(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Case[], void, undefined> {
  const params: Record<string, string> = {
    $select: CASE_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Case>("/incidents", params);
}
