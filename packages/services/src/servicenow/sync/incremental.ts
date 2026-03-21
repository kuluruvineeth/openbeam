import type {
  ServiceNowSyncBatch,
  ServiceNowSyncCursor,
  ServiceNowTransformContext,
} from "@openbeam/types/services/connectors/servicenow";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  getChangeRequestsUpdatedAfter,
  getIncidentsUpdatedAfter,
  getKnowledgeArticlesUpdatedAfter,
} from "../api";
import type { ServiceNowClient } from "../client";
import { transformServiceNowChangeRequest } from "../transformers/change-request";
import { transformServiceNowIncident } from "../transformers/incident";
import { transformServiceNowKnowledgeArticle } from "../transformers/knowledge";
import { parseServiceNowDate } from "../transformers/utils";
import { servicenowFullSync } from "./full";

export async function* servicenowIncrementalSync(
  client: ServiceNowClient,
  context: ServiceNowTransformContext,
  options: {
    cursor?: ServiceNowSyncCursor;
    batchSize?: number;
  } = {}
): AsyncGenerator<ServiceNowSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* servicenowFullSync(client, context, { batchSize });
    return;
  }

  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestSyncTime = cursor.lastSyncTime;

  const updatedAfter = new Date(cursor.lastSyncTime)
    .toISOString()
    .replace("T", " ")
    .replace("Z", "");

  try {
    for await (const incidents of getIncidentsUpdatedAfter(
      client,
      updatedAfter
    )) {
      for (const incident of incidents) {
        try {
          documents.push(transformServiceNowIncident(incident, context));
          processed += 1;
          const ts = parseServiceNowDate(incident.sys_updated_on);
          if (ts > latestSyncTime) {
            latestSyncTime = ts;
          }
        } catch (error) {
          logger.error(
            { error, sysId: incident.sys_id },
            "Error transforming ServiceNow incident"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped: 0, errors },
        };
        documents = [];
      }
    }

    for await (const articles of getKnowledgeArticlesUpdatedAfter(
      client,
      updatedAfter
    )) {
      for (const article of articles) {
        try {
          documents.push(transformServiceNowKnowledgeArticle(article, context));
          processed += 1;
          const ts = parseServiceNowDate(article.sys_updated_on);
          if (ts > latestSyncTime) {
            latestSyncTime = ts;
          }
        } catch (error) {
          logger.error(
            { error, sysId: article.sys_id },
            "Error transforming ServiceNow knowledge article"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped: 0, errors },
        };
        documents = [];
      }
    }

    for await (const changeRequests of getChangeRequestsUpdatedAfter(
      client,
      updatedAfter
    )) {
      for (const cr of changeRequests) {
        try {
          documents.push(transformServiceNowChangeRequest(cr, context));
          processed += 1;
          const ts = parseServiceNowDate(cr.sys_updated_on);
          if (ts > latestSyncTime) {
            latestSyncTime = ts;
          }
        } catch (error) {
          logger.error(
            { error, sysId: cr.sys_id },
            "Error transforming ServiceNow change request"
          );
          errors += 1;
        }
      }

      if (documents.length >= batchSize) {
        yield {
          items: documents,
          cursor: {
            lastSyncTime: latestSyncTime,
            lastFullSync: cursor.lastFullSync,
          },
          hasMore: true,
          stats: { processed, skipped: 0, errors },
        };
        documents = [];
      }
    }

    yield {
      items: documents,
      cursor: {
        lastSyncTime: latestSyncTime,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed, skipped: 0, errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "ServiceNow incremental sync failed, falling back to full"
    );
    yield* servicenowFullSync(client, context, { batchSize });
  }
}
