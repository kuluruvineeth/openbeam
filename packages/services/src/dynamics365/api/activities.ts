import type { Dynamics365Client } from "../client";

export type Dynamics365Activity = {
  activityid: string;
  subject: string | null;
  description: string | null;
  activitytypecode: string;
  statecode: number;
  statuscode: number;
  scheduledstart: string | null;
  scheduledend: string | null;
  actualstart: string | null;
  actualend: string | null;
  _regardingobjectid_value: string | null;
  "_regardingobjectid_value@OData.Community.Display.V1.FormattedValue"?: string;
  _ownerid_value: string | null;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
  createdon: string;
  modifiedon: string;
};

const ACTIVITY_SELECT = [
  "activityid",
  "subject",
  "description",
  "activitytypecode",
  "statecode",
  "statuscode",
  "scheduledstart",
  "scheduledend",
  "actualstart",
  "actualend",
  "_regardingobjectid_value",
  "_ownerid_value",
  "createdon",
  "modifiedon",
].join(",");

export function listAllActivities(
  client: Dynamics365Client,
  filter?: string
): AsyncGenerator<Dynamics365Activity[], void, undefined> {
  const params: Record<string, string> = {
    $select: ACTIVITY_SELECT,
    $orderby: "modifiedon asc",
  };
  if (filter) {
    params.$filter = filter;
  }
  return client.listAll<Dynamics365Activity>("/activitypointers", params);
}
