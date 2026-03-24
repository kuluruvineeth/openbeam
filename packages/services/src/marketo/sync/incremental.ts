import type {
  MarketoSyncBatch,
  MarketoSyncCursor,
  MarketoTransformContext,
} from "@openbeam/types/services/connectors/marketo";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listActivities, listActivityTypes } from "../api/activities";
import { listAllCampaigns } from "../api/campaigns";
import { listAllEmails } from "../api/emails";
import { listAllLandingPages } from "../api/landing-pages";
import { listAllLeadsViaLists } from "../api/leads";
import { listAllPrograms } from "../api/programs";
import type { MarketoClient } from "../client";
import { transformMarketoActivity } from "../transformers/activity";
import { transformMarketoCampaign } from "../transformers/campaign";
import { transformMarketoEmail } from "../transformers/email";
import { transformMarketoLandingPage } from "../transformers/landing-page";
import { transformMarketoLead } from "../transformers/lead";
import { transformMarketoProgram } from "../transformers/program";
import { marketoFullSync } from "./full";

type SyncOptions = {
  cursor?: MarketoSyncCursor;
  batchSize?: number;
  syncActivities?: boolean;
  syncCampaigns?: boolean;
  syncPrograms?: boolean;
  syncEmails?: boolean;
  syncLandingPages?: boolean;
};

export async function* marketoIncrementalSync(
  client: MarketoClient,
  context: MarketoTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<MarketoSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, batchSize = 100 } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* marketoFullSync(client, context, options);
    return;
  }

  const syncActivities = options.syncActivities ?? true;
  const syncCampaigns = options.syncCampaigns ?? true;
  const syncPrograms = options.syncPrograms ?? true;
  const syncEmails = options.syncEmails ?? true;
  const syncLandingPages = options.syncLandingPages ?? true;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = cursor.lastSyncTime;

  const sinceDate = new Date(cursor.lastSyncTime);
  const sinceIso = sinceDate.toISOString();

  try {
    for await (const leads of listAllLeadsViaLists(client)) {
      for (const lead of leads) {
        const updatedAt = new Date(lead.updatedAt).getTime();
        if (updatedAt <= cursor.lastSyncTime) {
          continue;
        }
        try {
          documents.push(transformMarketoLead(lead, context));
          processed += 1;
          if (updatedAt > latestModified) {
            latestModified = updatedAt;
          }
        } catch (error) {
          logger.error(
            { error, leadId: lead.id },
            "Error transforming Marketo lead"
          );
          errors += 1;
        }
      }
      if (documents.length >= batchSize) {
        yield makeBatch({
          items: documents,
          stats: { processed, skipped, errors },
          hasMore: true,
          latestModified,
          cursor,
        });
        documents = [];
      }
    }

    if (syncCampaigns) {
      for await (const campaigns of listAllCampaigns(client)) {
        for (const campaign of campaigns) {
          const updatedAt = new Date(campaign.updatedAt).getTime();
          if (updatedAt <= cursor.lastSyncTime) {
            continue;
          }
          try {
            documents.push(transformMarketoCampaign(campaign, context));
            processed += 1;
            if (updatedAt > latestModified) {
              latestModified = updatedAt;
            }
          } catch (error) {
            logger.error(
              { error, campaignId: campaign.id },
              "Error transforming Marketo campaign"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    if (syncPrograms) {
      for await (const programs of listAllPrograms(client)) {
        for (const program of programs) {
          const updatedAt = new Date(program.updatedAt).getTime();
          if (updatedAt <= cursor.lastSyncTime) {
            continue;
          }
          try {
            documents.push(transformMarketoProgram(program, context));
            processed += 1;
            if (updatedAt > latestModified) {
              latestModified = updatedAt;
            }
          } catch (error) {
            logger.error(
              { error, programId: program.id },
              "Error transforming Marketo program"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    if (syncEmails) {
      for await (const emails of listAllEmails(client)) {
        for (const email of emails) {
          const updatedAt = new Date(email.updatedAt).getTime();
          if (updatedAt <= cursor.lastSyncTime) {
            continue;
          }
          try {
            documents.push(transformMarketoEmail(email, context));
            processed += 1;
            if (updatedAt > latestModified) {
              latestModified = updatedAt;
            }
          } catch (error) {
            logger.error(
              { error, emailId: email.id },
              "Error transforming Marketo email"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    if (syncLandingPages) {
      for await (const pages of listAllLandingPages(client)) {
        for (const page of pages) {
          const updatedAt = new Date(page.updatedAt).getTime();
          if (updatedAt <= cursor.lastSyncTime) {
            continue;
          }
          try {
            documents.push(transformMarketoLandingPage(page, context));
            processed += 1;
            if (updatedAt > latestModified) {
              latestModified = updatedAt;
            }
          } catch (error) {
            logger.error(
              { error, pageId: page.id },
              "Error transforming Marketo landing page"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
        }
      }
    }

    if (syncActivities) {
      const activityTypes = await listActivityTypes(client);

      for await (const activities of listActivities(client, sinceIso)) {
        for (const activity of activities) {
          try {
            documents.push(
              transformMarketoActivity(activity, activityTypes, context)
            );
            processed += 1;
            const ts = new Date(activity.activityDate).getTime();
            if (ts > latestModified) {
              latestModified = ts;
            }
          } catch (error) {
            logger.error(
              { error, activityId: activity.id },
              "Error transforming Marketo activity"
            );
            errors += 1;
          }
        }
        if (documents.length >= batchSize) {
          yield makeBatch({
            items: documents,
            stats: { processed, skipped, errors },
            hasMore: true,
            latestModified,
            cursor,
          });
          documents = [];
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
      "Marketo incremental sync failed, falling back to full"
    );
    yield* marketoFullSync(client, context, options);
  }
}

type MakeBatchParams = {
  items: GenericDocument[];
  stats: { processed: number; skipped: number; errors: number };
  hasMore: boolean;
  latestModified: number;
  cursor: MarketoSyncCursor;
};

function makeBatch(params: MakeBatchParams): MarketoSyncBatch<GenericDocument> {
  return {
    items: params.items,
    cursor: {
      lastSyncTime: params.latestModified,
      lastFullSync: params.cursor.lastFullSync,
    },
    hasMore: params.hasMore,
    stats: params.stats,
  };
}
