import type { MarketoClient } from "../client";

export type MarketoLead = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  phone: string | null;
  leadSource: string | null;
  leadStatus: string | null;
  website: string | null;
  industry: string | null;
  annualRevenue: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

const LEAD_FIELDS = [
  "id",
  "firstName",
  "lastName",
  "email",
  "company",
  "title",
  "phone",
  "leadSource",
  "leadStatus",
  "website",
  "industry",
  "annualRevenue",
  "city",
  "state",
  "country",
  "createdAt",
  "updatedAt",
].join(",");

export function listAllLeads(
  client: MarketoClient,
  filterType = "updatedAt",
  sinceDate?: string
): AsyncGenerator<MarketoLead[], void, undefined> {
  if (filterType === "updatedAt" && sinceDate) {
    return client.listAllApi<MarketoLead>("/v1/leads.json", {
      filterType: "updatedAt",
      filterValues: sinceDate,
      fields: LEAD_FIELDS,
    });
  }
  return client.listAllApi<MarketoLead>("/v1/leads.json", {
    filterType: "id",
    filterValues: "1",
    fields: LEAD_FIELDS,
  });
}

export function listLeadsByList(
  client: MarketoClient,
  listId: number
): AsyncGenerator<MarketoLead[], void, undefined> {
  return client.listAllApi<MarketoLead>(`/v1/list/${listId}/leads.json`, {
    fields: LEAD_FIELDS,
  });
}

type MarketoList = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  workspaceName?: string;
};

export function listAllStaticLists(
  client: MarketoClient
): AsyncGenerator<MarketoList[], void, undefined> {
  return client.listAllApi<MarketoList>("/v1/lists.json");
}

export async function* listAllLeadsViaLists(
  client: MarketoClient
): AsyncGenerator<MarketoLead[], void, undefined> {
  for await (const lists of listAllStaticLists(client)) {
    for (const list of lists) {
      yield* listLeadsByList(client, list.id);
    }
  }
}
