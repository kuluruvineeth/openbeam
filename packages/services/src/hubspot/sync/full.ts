import type {
  HubSpotSyncBatch,
  HubSpotSyncCursor,
  HubSpotTransformContext,
} from "@openbeam/types/services/connectors/hubspot";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllCompanies } from "../api/companies";
import { listAllContacts } from "../api/contacts";
import { listAllDeals } from "../api/deals";
import { listAllTickets } from "../api/tickets";
import type { HubSpotClient } from "../client";
import { transformHubSpotCompany } from "../transformers/company";
import { transformHubSpotContact } from "../transformers/contact";
import { transformHubSpotDeal } from "../transformers/deal";
import { transformHubSpotTicket } from "../transformers/ticket";

export async function* hubspotFullSync(
  client: HubSpotClient,
  context: HubSpotTransformContext,
  options: {
    batchSize?: number;
    syncContacts?: boolean;
    syncCompanies?: boolean;
    syncDeals?: boolean;
    syncTickets?: boolean;
    extraProperties?: string[];
  } = {}
): AsyncGenerator<HubSpotSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncContacts = options.syncContacts ?? true;
  const syncCompanies = options.syncCompanies ?? true;
  const syncDeals = options.syncDeals ?? true;
  const syncTickets = options.syncTickets ?? true;
  const extra = options.extraProperties ?? [];

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  if (syncContacts) {
    for await (const contacts of listAllContacts(client, extra)) {
      for (const contact of contacts) {
        try {
          documents.push(transformHubSpotContact(contact, context));
          processed += 1;
          latestModified = trackModified(contact.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, contactId: contact.id },
            "Error transforming HubSpot contact"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncCompanies) {
    for await (const companies of listAllCompanies(client, extra)) {
      for (const company of companies) {
        try {
          documents.push(transformHubSpotCompany(company, context));
          processed += 1;
          latestModified = trackModified(company.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, companyId: company.id },
            "Error transforming HubSpot company"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncDeals) {
    for await (const deals of listAllDeals(client, extra)) {
      for (const deal of deals) {
        try {
          documents.push(transformHubSpotDeal(deal, context));
          processed += 1;
          latestModified = trackModified(deal.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, dealId: deal.id },
            "Error transforming HubSpot deal"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  if (syncTickets) {
    for await (const tickets of listAllTickets(client, extra)) {
      for (const ticket of tickets) {
        try {
          documents.push(transformHubSpotTicket(ticket, context));
          processed += 1;
          latestModified = trackModified(ticket.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, ticketId: ticket.id },
            "Error transforming HubSpot ticket"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch(
          documents,
          { processed, skipped, errors },
          true,
          latestModified
        );
        documents = [];
      }
    }
  }

  const cursor: HubSpotSyncCursor = {
    lastSyncTime: latestModified || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(
  items: GenericDocument[],
  stats: { processed: number; skipped: number; errors: number },
  hasMore: boolean,
  latestModified: number
): HubSpotSyncBatch<GenericDocument> {
  return {
    items,
    cursor: {
      lastSyncTime: latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats,
  };
}

function trackModified(updatedAt: string, current: number): number {
  const ts = new Date(updatedAt).getTime();
  return ts > current ? ts : current;
}
