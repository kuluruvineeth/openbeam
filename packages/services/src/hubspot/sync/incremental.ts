import type {
  HubSpotSyncBatch,
  HubSpotSyncCursor,
  HubSpotTransformContext,
} from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { searchCompaniesModifiedAfter } from "../api/companies";
import { searchContactsModifiedAfter } from "../api/contacts";
import { searchDealsModifiedAfter } from "../api/deals";
import { searchTicketsModifiedAfter } from "../api/tickets";
import type { HubSpotClient } from "../client";
import { transformHubSpotCompany } from "../transformers/company";
import { transformHubSpotContact } from "../transformers/contact";
import { transformHubSpotDeal } from "../transformers/deal";
import { transformHubSpotTicket } from "../transformers/ticket";
import { hubspotFullSync } from "./full";

type ObjectSyncConfig = {
  name: string;
  enabled: boolean;
  search: (
    client: HubSpotClient,
    since: number,
    extra: string[]
  ) => AsyncGenerator<unknown[], void, undefined>;
  transform: (record: unknown, ctx: HubSpotTransformContext) => GenericDocument;
};

export async function* hubspotIncrementalSync(
  client: HubSpotClient,
  context: HubSpotTransformContext,
  options: {
    cursor?: HubSpotSyncCursor;
    batchSize?: number;
    syncContacts?: boolean;
    syncCompanies?: boolean;
    syncDeals?: boolean;
    syncTickets?: boolean;
    extraProperties?: string[];
  } = {}
): AsyncGenerator<HubSpotSyncBatch<GenericDocument>, void, undefined> {
  const {
    cursor,
    batchSize = 100,
    syncContacts = true,
    syncCompanies = true,
    syncDeals = true,
    syncTickets = true,
    extraProperties = [],
  } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* hubspotFullSync(client, context, {
      batchSize,
      syncContacts,
      syncCompanies,
      syncDeals,
      syncTickets,
      extraProperties,
    });
    return;
  }

  const objectConfigs: ObjectSyncConfig[] = [
    {
      name: "contacts",
      enabled: syncContacts,
      search: (c, since, extra) => searchContactsModifiedAfter(c, since, extra),
      transform: (r, ctx) =>
        transformHubSpotContact(
          r as Parameters<typeof transformHubSpotContact>[0],
          ctx
        ),
    },
    {
      name: "companies",
      enabled: syncCompanies,
      search: (c, since, extra) =>
        searchCompaniesModifiedAfter(c, since, extra),
      transform: (r, ctx) =>
        transformHubSpotCompany(
          r as Parameters<typeof transformHubSpotCompany>[0],
          ctx
        ),
    },
    {
      name: "deals",
      enabled: syncDeals,
      search: (c, since, extra) => searchDealsModifiedAfter(c, since, extra),
      transform: (r, ctx) =>
        transformHubSpotDeal(
          r as Parameters<typeof transformHubSpotDeal>[0],
          ctx
        ),
    },
    {
      name: "tickets",
      enabled: syncTickets,
      search: (c, since, extra) => searchTicketsModifiedAfter(c, since, extra),
      transform: (r, ctx) =>
        transformHubSpotTicket(
          r as Parameters<typeof transformHubSpotTicket>[0],
          ctx
        ),
    },
  ];

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  try {
    for (const config of objectConfigs) {
      if (!config.enabled) {
        continue;
      }

      for await (const records of config.search(
        client,
        cursor.lastSyncTime,
        extraProperties
      )) {
        for (const record of records) {
          try {
            const doc = config.transform(record, context);
            documents.push(doc);
            processed += 1;

            const recordUpdated = (record as { updatedAt: string }).updatedAt;
            const ts = new Date(recordUpdated).getTime();
            if (ts > latestModified) {
              latestModified = ts;
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  lastSyncTime: latestModified,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, objectType: config.name },
              "Error transforming HubSpot record"
            );
            errors += 1;
          }
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "HubSpot incremental sync failed, falling back to full"
    );
    yield* hubspotFullSync(client, context, {
      batchSize,
      syncContacts,
      syncCompanies,
      syncDeals,
      syncTickets,
      extraProperties,
    });
  }
}
