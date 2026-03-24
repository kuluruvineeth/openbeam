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

export async function* marketoFullSync(
  client: MarketoClient,
  context: MarketoTransformContext,
  options: {
    batchSize?: number;
    syncActivities?: boolean;
    syncCampaigns?: boolean;
    syncPrograms?: boolean;
    syncEmails?: boolean;
    syncLandingPages?: boolean;
    lookbackDays?: number;
  } = {}
): AsyncGenerator<MarketoSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const syncActivities = options.syncActivities ?? true;
  const syncCampaigns = options.syncCampaigns ?? true;
  const syncPrograms = options.syncPrograms ?? true;
  const syncEmails = options.syncEmails ?? true;
  const syncLandingPages = options.syncLandingPages ?? true;
  const lookbackDays = options.lookbackDays ?? 90;

  let documents: GenericDocument[] = [];
  let processed = 0;
  const skipped = 0;
  let errors = 0;
  let latestModified = 0;

  for await (const leads of listAllLeadsViaLists(client)) {
    for (const lead of leads) {
      try {
        documents.push(transformMarketoLead(lead, context));
        processed += 1;
        latestModified = trackModified(lead.updatedAt, latestModified);
      } catch (error) {
        logger.error(
          { error, leadId: lead.id },
          "Error transforming Marketo lead"
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

  if (syncCampaigns) {
    for await (const campaigns of listAllCampaigns(client)) {
      for (const campaign of campaigns) {
        try {
          documents.push(transformMarketoCampaign(campaign, context));
          processed += 1;
          latestModified = trackModified(campaign.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, campaignId: campaign.id },
            "Error transforming Marketo campaign"
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

  if (syncPrograms) {
    for await (const programs of listAllPrograms(client)) {
      for (const program of programs) {
        try {
          documents.push(transformMarketoProgram(program, context));
          processed += 1;
          latestModified = trackModified(program.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, programId: program.id },
            "Error transforming Marketo program"
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

  if (syncEmails) {
    for await (const emails of listAllEmails(client)) {
      for (const email of emails) {
        try {
          documents.push(transformMarketoEmail(email, context));
          processed += 1;
          latestModified = trackModified(email.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, emailId: email.id },
            "Error transforming Marketo email"
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

  if (syncLandingPages) {
    for await (const pages of listAllLandingPages(client)) {
      for (const page of pages) {
        try {
          documents.push(transformMarketoLandingPage(page, context));
          processed += 1;
          latestModified = trackModified(page.updatedAt, latestModified);
        } catch (error) {
          logger.error(
            { error, pageId: page.id },
            "Error transforming Marketo landing page"
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

  if (syncActivities) {
    const activityTypes = await listActivityTypes(client);
    const sinceDate = new Date(
      Date.now() - lookbackDays * 86_400_000
    ).toISOString();

    for await (const activities of listActivities(client, sinceDate)) {
      for (const activity of activities) {
        try {
          documents.push(
            transformMarketoActivity(activity, activityTypes, context)
          );
          processed += 1;
          latestModified = trackModified(activity.activityDate, latestModified);
        } catch (error) {
          logger.error(
            { error, activityId: activity.id },
            "Error transforming Marketo activity"
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

  const cursor: MarketoSyncCursor = {
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
): MarketoSyncBatch<GenericDocument> {
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

function trackModified(dateStr: string, current: number): number {
  const ts = new Date(dateStr).getTime();
  return ts > current ? ts : current;
}
