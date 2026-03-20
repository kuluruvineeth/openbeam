import type {
  SalesforceSyncBatch,
  SalesforceSyncCursor,
  SalesforceTransformContext,
} from "@openbeam/types/services/connectors/salesforce";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { SalesforceClient } from "../client";
import {
  type SalesforceAccount,
  transformSalesforceAccount,
} from "../transformers/account";
import {
  type SalesforceCase,
  transformSalesforceCase,
} from "../transformers/case";
import {
  type SalesforceContact,
  transformSalesforceContact,
} from "../transformers/contact";
import {
  type SalesforceOpportunity,
  transformSalesforceOpportunity,
} from "../transformers/opportunity";

const ACCOUNT_FIELDS =
  "Id,Name,Description,Industry,Website,Phone,BillingCity,BillingState,BillingCountry,NumberOfEmployees,AnnualRevenue,Type,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,SystemModstamp";
const CONTACT_FIELDS =
  "Id,FirstName,LastName,Name,Email,Phone,Title,Department,Account.Name,Account.Id,Owner.Name,Description,CreatedDate,LastModifiedDate,SystemModstamp";
const OPPORTUNITY_FIELDS =
  "Id,Name,Description,StageName,Amount,Probability,CloseDate,Type,LeadSource,Account.Name,Account.Id,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,SystemModstamp,IsClosed,IsWon";
const CASE_FIELDS =
  "Id,CaseNumber,Subject,Description,Status,Priority,Type,Reason,Origin,Contact.Name,Contact.Email,Account.Name,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,ClosedDate,SystemModstamp,IsClosed";

export async function* salesforceFullSync(
  client: SalesforceClient,
  context: SalesforceTransformContext,
  options: {
    batchSize?: number;
    syncCases?: boolean;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<SalesforceSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 200;
  const syncCases = options.syncCases ?? true;
  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModstamp: string | undefined;

  const dateFilter = options.lookbackDays
    ? ` WHERE SystemModstamp >= ${buildDateLiteral(options.lookbackDays)}`
    : "";

  for await (const accounts of client.queryAll<SalesforceAccount>(
    `SELECT ${ACCOUNT_FIELDS} FROM Account${dateFilter} ORDER BY SystemModstamp ASC`
  )) {
    for (const account of accounts) {
      try {
        documents.push(transformSalesforceAccount(account, context));
        processed += 1;
        latestModstamp = trackModstamp(account.SystemModstamp, latestModstamp);
      } catch (error) {
        logger.error(
          { error, accountId: account.Id },
          "Error transforming Account"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch({
        items: documents,
        stats: { processed, skipped, errors },
        hasMore: true,
      });
      documents = [];
    }
  }

  for await (const contacts of client.queryAll<SalesforceContact>(
    `SELECT ${CONTACT_FIELDS} FROM Contact${dateFilter} ORDER BY SystemModstamp ASC`
  )) {
    for (const contact of contacts) {
      try {
        documents.push(transformSalesforceContact(contact, context));
        processed += 1;
        latestModstamp = trackModstamp(contact.SystemModstamp, latestModstamp);
      } catch (error) {
        logger.error(
          { error, contactId: contact.Id },
          "Error transforming Contact"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch({
        items: documents,
        stats: { processed, skipped, errors },
        hasMore: true,
      });
      documents = [];
    }
  }

  for await (const opps of client.queryAll<SalesforceOpportunity>(
    `SELECT ${OPPORTUNITY_FIELDS} FROM Opportunity${dateFilter} ORDER BY SystemModstamp ASC`
  )) {
    for (const opp of opps) {
      try {
        documents.push(transformSalesforceOpportunity(opp, context));
        processed += 1;
        latestModstamp = trackModstamp(opp.SystemModstamp, latestModstamp);
      } catch (error) {
        logger.error(
          { error, oppId: opp.Id },
          "Error transforming Opportunity"
        );
        errors += 1;
      }
    }
    if (documents.length >= batchSize) {
      yield makeBatch({
        items: documents,
        stats: { processed, skipped, errors },
        hasMore: true,
      });
      documents = [];
    }
  }

  if (syncCases) {
    for await (const cases of client.queryAll<SalesforceCase>(
      `SELECT ${CASE_FIELDS} FROM Case${dateFilter} ORDER BY SystemModstamp ASC`
    )) {
      for (const sfCase of cases) {
        try {
          documents.push(transformSalesforceCase(sfCase, context));
          processed += 1;
          latestModstamp = trackModstamp(sfCase.SystemModstamp, latestModstamp);
        } catch (error) {
          logger.error({ error, caseId: sfCase.Id }, "Error transforming Case");
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch({
          items: documents,
          stats: { processed, skipped, errors },
          hasMore: true,
        });
        documents = [];
      }
    }
  }

  const cursor: SalesforceSyncCursor = {
    lastSyncTime: latestModstamp,
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped, errors },
  };
}

function makeBatch(params: {
  items: GenericDocument[];
  stats: { processed: number; skipped: number; errors: number };
  hasMore: boolean;
}): SalesforceSyncBatch<GenericDocument> {
  return {
    items: params.items,
    cursor: { lastFullSync: Date.now() },
    hasMore: params.hasMore,
    stats: params.stats,
  };
}

function trackModstamp(current: string, latest: string | undefined): string {
  if (!latest || current > latest) {
    return current;
  }
  return latest;
}

function buildDateLiteral(lookbackDays: number): string {
  const date = new Date(Date.now() - lookbackDays * 86_400_000);
  return date.toISOString();
}
