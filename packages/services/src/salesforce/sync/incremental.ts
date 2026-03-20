import type {
  SalesforceSyncBatch,
  SalesforceSyncCursor,
  SalesforceTransformContext,
} from "@openbeam/types/services/connectors/salesforce";

const SOQL_MS_REGEX = /\.\d{3}/;

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
import { salesforceFullSync } from "./full";

type SObjectRecord = {
  Id: string;
  SystemModstamp: string;
  attributes: { type: string };
};

export async function* salesforceIncrementalSync(
  client: SalesforceClient,
  context: SalesforceTransformContext,
  options: {
    cursor?: SalesforceSyncCursor;
    batchSize?: number;
    syncCases?: boolean;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<SalesforceSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 200, syncCases = true } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* salesforceFullSync(client, context, {
      batchSize,
      syncCases,
      lookbackDays: options.lookbackDays,
    });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModstamp: string | undefined = cursor.lastSyncTime;

  const sinceFilter = `WHERE SystemModstamp > ${formatSoqlDatetime(cursor.lastSyncTime)}`;
  const orderBy = "ORDER BY SystemModstamp ASC";

  const objectConfigs: Array<{
    sobject: string;
    fields: string;
    transform: (
      record: unknown,
      ctx: SalesforceTransformContext
    ) => GenericDocument;
    enabled: boolean;
  }> = [
    {
      sobject: "Account",
      fields:
        "Id,Name,Description,Industry,Website,Phone,BillingCity,BillingState,BillingCountry,NumberOfEmployees,AnnualRevenue,Type,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,SystemModstamp",
      transform: (r, ctx) =>
        transformSalesforceAccount(r as SalesforceAccount, ctx),
      enabled: true,
    },
    {
      sobject: "Contact",
      fields:
        "Id,FirstName,LastName,Name,Email,Phone,Title,Department,Account.Name,Account.Id,Owner.Name,Description,CreatedDate,LastModifiedDate,SystemModstamp",
      transform: (r, ctx) =>
        transformSalesforceContact(r as SalesforceContact, ctx),
      enabled: true,
    },
    {
      sobject: "Opportunity",
      fields:
        "Id,Name,Description,StageName,Amount,Probability,CloseDate,Type,LeadSource,Account.Name,Account.Id,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,SystemModstamp,IsClosed,IsWon",
      transform: (r, ctx) =>
        transformSalesforceOpportunity(r as SalesforceOpportunity, ctx),
      enabled: true,
    },
    {
      sobject: "Case",
      fields:
        "Id,CaseNumber,Subject,Description,Status,Priority,Type,Reason,Origin,Contact.Name,Contact.Email,Account.Name,Owner.Name,Owner.Email,CreatedDate,LastModifiedDate,ClosedDate,SystemModstamp,IsClosed",
      transform: (r, ctx) => transformSalesforceCase(r as SalesforceCase, ctx),
      enabled: syncCases,
    },
  ];

  try {
    for (const config of objectConfigs) {
      if (!config.enabled) {
        continue;
      }

      const soql = `SELECT ${config.fields} FROM ${config.sobject} ${sinceFilter} ${orderBy}`;

      for await (const records of client.queryAll<SObjectRecord>(soql)) {
        for (const record of records) {
          try {
            const doc = config.transform(record, context);
            documents.push(doc);
            processed += 1;

            if (record.SystemModstamp > (latestModstamp ?? "")) {
              latestModstamp = record.SystemModstamp;
            }

            if (documents.length >= batchSize) {
              yield {
                items: documents,
                cursor: {
                  lastSyncTime: latestModstamp,
                  lastFullSync: cursor.lastFullSync,
                },
                hasMore: true,
                stats: { processed, skipped, errors },
              };
              documents = [];
            }
          } catch (error) {
            logger.error(
              { error, recordId: record.Id, sobject: config.sobject },
              "Error transforming Salesforce record"
            );
            errors += 1;
          }
        }
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestModstamp,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "Salesforce incremental sync failed, falling back to full"
    );
    yield* salesforceFullSync(client, context, {
      batchSize,
      syncCases,
      lookbackDays: options.lookbackDays,
    });
  }
}

function formatSoqlDatetime(iso: string): string {
  return iso.replace("Z", "+0000").replace(SOQL_MS_REGEX, "");
}
