import type { HubSpotClient } from "../client";

export type HubSpotDeal = {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    pipeline?: string;
    closedate?: string;
    description?: string;
    hubspot_owner_id?: string;
    lastmodifieddate?: string;
    createdate?: string;
    hs_deal_stage_probability?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
};

const DEAL_PROPERTIES = [
  "dealname",
  "amount",
  "dealstage",
  "pipeline",
  "closedate",
  "description",
  "hubspot_owner_id",
  "lastmodifieddate",
  "createdate",
  "hs_deal_stage_probability",
];

export function listAllDeals(
  client: HubSpotClient,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotDeal[], void, undefined> {
  return client.listAll<HubSpotDeal>("deals", [
    ...DEAL_PROPERTIES,
    ...extraProperties,
  ]);
}

export function searchDealsModifiedAfter(
  client: HubSpotClient,
  sinceTimestamp: number,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotDeal[], void, undefined> {
  return client.searchAll<HubSpotDeal>(
    "deals",
    [...DEAL_PROPERTIES, ...extraProperties],
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
