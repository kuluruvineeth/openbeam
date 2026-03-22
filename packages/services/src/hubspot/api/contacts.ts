import type { HubSpotClient } from "../client";

export type HubSpotContact = {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
    jobtitle?: string;
    lifecyclestage?: string;
    lastmodifieddate?: string;
    createdate?: string;
    hubspot_owner_id?: string;
    [key: string]: string | undefined;
  };
  createdAt: string;
  updatedAt: string;
};

const CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "company",
  "jobtitle",
  "lifecyclestage",
  "lastmodifieddate",
  "createdate",
  "hubspot_owner_id",
];

export function listAllContacts(
  client: HubSpotClient,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotContact[], void, undefined> {
  return client.listAll<HubSpotContact>("contacts", [
    ...CONTACT_PROPERTIES,
    ...extraProperties,
  ]);
}

export function searchContactsModifiedAfter(
  client: HubSpotClient,
  sinceTimestamp: number,
  extraProperties: string[] = []
): AsyncGenerator<HubSpotContact[], void, undefined> {
  return client.searchAll<HubSpotContact>(
    "contacts",
    [...CONTACT_PROPERTIES, ...extraProperties],
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
