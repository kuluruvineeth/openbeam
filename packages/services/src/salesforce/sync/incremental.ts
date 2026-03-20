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
  type SalesforceKnowledgeArticle,
  transformSalesforceArticle,
} from "../transformers/article";
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
    {
      sobject: "Knowledge__kav",
      fields:
        "Id,Title,Summary,ArticleBody,UrlName,ArticleNumber,PublishStatus,VersionNumber,KnowledgeArticleId,CreatedDate,LastModifiedDate,SystemModstamp,CreatedBy.Name,CreatedBy.Email,LastModifiedBy.Name",
      transform: (r, ctx) =>
        transformSalesforceArticle(r as SalesforceKnowledgeArticle, ctx),
      enabled: true,
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

    const deletionMarkers = await fetchDeletionMarkers(
      client,
      context,
      cursor.lastSyncTime,
      objectConfigs.filter((c) => c.enabled).map((c) => c.sobject)
    );
    if (deletionMarkers.length > 0) {
      documents.push(...deletionMarkers);
      processed += deletionMarkers.length;
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

const SOBJECT_TYPE_MAP: Record<string, string> = {
  Account: "account",
  Contact: "contact",
  Opportunity: "opportunity",
  Case: "case",
  Knowledge__kav: "article",
};

async function fetchDeletionMarkers(
  client: SalesforceClient,
  context: SalesforceTransformContext,
  sinceTime: string,
  sobjects: string[]
): Promise<GenericDocument[]> {
  const deletionMarkers: GenericDocument[] = [];
  const now = new Date().toISOString();

  for (const sobject of sobjects) {
    try {
      const result = await client.getDeleted(sobject, sinceTime, now);
      const docType = SOBJECT_TYPE_MAP[sobject] ?? sobject.toLowerCase();

      for (const deleted of result.deletedRecords) {
        deletionMarkers.push({
          id: `${context.connectorId}_${docType}_${deleted.id}`,
          connector_id: context.connectorId,
          connector_type: context.connectorType,
          team_id: context.teamId,
          workspace_id: context.workspaceId,
          external_id: deleted.id,
          document_type: docType,
          title: "",
          content: "",
          url: "",
          metadata: { deleted: true },
        } as unknown as GenericDocument);
      }
    } catch (error) {
      logger.warn(
        { error, sobject },
        "Failed to fetch deleted records for object"
      );
    }
  }

  return deletionMarkers;
}
