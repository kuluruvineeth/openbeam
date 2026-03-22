import type { HubSpotClient } from "../client";

export type HubSpotTicket = {
  id: string;
  properties: {
    subject?: string;
    content?: string;
    hs_pipeline_stage?: string;
    hs_pipeline?: string;
    hs_ticket_priority?: string;
    hubspot_owner_id?: string;
    lastmodifieddate?: string;
    createdate?: string;
    closed_date?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
};

const TICKET_PROPERTIES = [
  "subject",
  "content",
  "hs_pipeline_stage",
  "hs_pipeline",
  "hs_ticket_priority",
  "hubspot_owner_id",
  "lastmodifieddate",
  "createdate",
  "closed_date",
];

export function listAllTickets(
  client: HubSpotClient,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotTicket[], void, undefined> {
  return client.listAll<HubSpotTicket>("tickets", [
    ...TICKET_PROPERTIES,
    ...extraProperties,
  ]);
}

export function searchTicketsModifiedAfter(
  client: HubSpotClient,
  sinceTimestamp: number,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotTicket[], void, undefined> {
  return client.searchAll<HubSpotTicket>(
    "tickets",
    [...TICKET_PROPERTIES, ...extraProperties],
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
