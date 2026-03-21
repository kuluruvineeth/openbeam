import type {
  ServiceNowSyncBatch,
  ServiceNowSyncCursor,
  ServiceNowTransformContext,
} from "@openbeam/types/services/connectors/servicenow";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import {
  getAllChangeRequests,
  getAllIncidents,
  getAllKnowledgeArticles,
} from "../api";
import type { ServiceNowClient } from "../client";
import { transformServiceNowChangeRequest } from "../transformers/change-request";
import { transformServiceNowIncident } from "../transformers/incident";
import { transformServiceNowKnowledgeArticle } from "../transformers/knowledge";
import { parseServiceNowDate } from "../transformers/utils";

export async function* servicenowFullSync(
  client: ServiceNowClient,
  context: ServiceNowTransformContext,
  options: { batchSize?: number } = {}
): AsyncGenerator<ServiceNowSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  let documents: GenericDocument[] = [];
  let processed = 0;
  let errors = 0;
  let latestUpdatedAt = 0;

  for await (const incidents of getAllIncidents(client)) {
    for (const incident of incidents) {
      try {
        documents.push(transformServiceNowIncident(incident, context));
        processed += 1;
        latestUpdatedAt = trackTimestamp(
          incident.sys_updated_on,
          latestUpdatedAt
        );
      } catch (error) {
        logger.error(
          { error, sysId: incident.sys_id },
          "Error transforming ServiceNow incident"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield makeBatch({ items: documents, processed, errors, latestUpdatedAt });
      documents = [];
    }
  }

  for await (const articles of getAllKnowledgeArticles(client)) {
    for (const article of articles) {
      try {
        documents.push(transformServiceNowKnowledgeArticle(article, context));
        processed += 1;
        latestUpdatedAt = trackTimestamp(
          article.sys_updated_on,
          latestUpdatedAt
        );
      } catch (error) {
        logger.error(
          { error, sysId: article.sys_id },
          "Error transforming ServiceNow knowledge article"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield makeBatch({ items: documents, processed, errors, latestUpdatedAt });
      documents = [];
    }
  }

  for await (const changeRequests of getAllChangeRequests(client)) {
    for (const cr of changeRequests) {
      try {
        documents.push(transformServiceNowChangeRequest(cr, context));
        processed += 1;
        latestUpdatedAt = trackTimestamp(cr.sys_updated_on, latestUpdatedAt);
      } catch (error) {
        logger.error(
          { error, sysId: cr.sys_id },
          "Error transforming ServiceNow change request"
        );
        errors += 1;
      }
    }

    if (documents.length >= batchSize) {
      yield makeBatch({ items: documents, processed, errors, latestUpdatedAt });
      documents = [];
    }
  }

  const cursor: ServiceNowSyncCursor = {
    lastSyncTime: latestUpdatedAt || Date.now(),
    lastFullSync: Date.now(),
  };

  yield {
    items: documents,
    cursor,
    hasMore: false,
    stats: { processed, skipped: 0, errors },
  };
}

function makeBatch(params: {
  items: GenericDocument[];
  processed: number;
  errors: number;
  latestUpdatedAt: number;
}): ServiceNowSyncBatch<GenericDocument> {
  return {
    items: params.items,
    cursor: {
      lastSyncTime: params.latestUpdatedAt || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: true,
    stats: { processed: params.processed, skipped: 0, errors: params.errors },
  };
}

function trackTimestamp(dateStr: string, current: number): number {
  const ts = parseServiceNowDate(dateStr);
  return ts > current ? ts : current;
}
