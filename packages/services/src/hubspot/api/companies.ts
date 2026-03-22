import type { HubSpotClient } from "../client";

export type HubSpotCompany = {
  id: string;
  properties: {
    name?: string;
    domain?: string;
    industry?: string;
    description?: string;
    numberofemployees?: string;
    phone?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    lastmodifieddate?: string;
    createdate?: string;
    hubspot_owner_id?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
};

const COMPANY_PROPERTIES = [
  "name",
  "domain",
  "industry",
  "description",
  "numberofemployees",
  "phone",
  "city",
  "state",
  "country",
  "website",
  "lastmodifieddate",
  "createdate",
  "hubspot_owner_id",
];

export function listAllCompanies(
  client: HubSpotClient,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotCompany[], void, undefined> {
  return client.listAll<HubSpotCompany>("companies", [
    ...COMPANY_PROPERTIES,
    ...extraProperties,
  ]);
}

export function searchCompaniesModifiedAfter(
  client: HubSpotClient,
  sinceTimestamp: number,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotCompany[], void, undefined> {
  return client.searchAll<HubSpotCompany>(
    "companies",
    [...COMPANY_PROPERTIES, ...extraProperties],
    {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "lastmodifieddate",
              operator: "GTE",
              value: String(sinceTimestamp),
            },
          ],
        },
      ],
      sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
    }
  );
}
