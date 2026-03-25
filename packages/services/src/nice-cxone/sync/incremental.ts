import type {
  NiceCxoneSyncBatch,
  NiceCxoneSyncCursor,
  NiceCxoneTransformContext,
} from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import { listAllAgents } from "../api/agents";
import { listAllCampaigns } from "../api/campaigns";
import { listCompletedContactsSince } from "../api/contacts";
import { listAllSkills } from "../api/skills";
import { listAllTeams } from "../api/teams";
import type { NiceCxoneClient } from "../client";
import { transformCxoneAgent } from "../transformers/agent";
import { transformCxoneCampaign } from "../transformers/campaign";
import { transformCxoneContact } from "../transformers/contact";
import { transformCxoneSkill } from "../transformers/skill";
import { transformCxoneTeam } from "../transformers/team";
import { niceCxoneFullSync } from "./full";
import { syncEntity } from "./shared";

type SyncOptions = {
  cursor?: NiceCxoneSyncCursor;
  batchSize?: number;
  lookbackDays?: number;
  syncContacts?: boolean;
  syncAgents?: boolean;
  syncSkills?: boolean;
  syncTeams?: boolean;
  syncCampaigns?: boolean;
};

export async function* niceCxoneIncrementalSync(
  client: NiceCxoneClient,
  context: NiceCxoneTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<NiceCxoneSyncBatch<GenericDocument>, void, undefined> {
  const { cursor } = options;

  if (!(cursor?.lastSyncTime && cursor?.lastFullSync)) {
    yield* niceCxoneFullSync(client, context, options);
    return;
  }

  const sinceDate = new Date(cursor.lastSyncTime).toISOString();
  const untilDate = new Date().toISOString();
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: cursor.lastSyncTime,
  };

  try {
    if (options.syncContacts !== false) {
      await syncEntity(
        {
          source: listCompletedContactsSince(client, sinceDate, untilDate),
          transform: transformCxoneContact,
          context,
          getUpdatedAt: (c) =>
            c.lastUpdateTime ?? c.contactEnd ?? c.contactStart,
          getItemId: (c) => c.contactId,
          entityName: "contact (incremental)",
        },
        state
      );
    }

    if (options.syncAgents !== false) {
      await syncEntity(
        {
          source: listAllAgents(client),
          transform: transformCxoneAgent,
          context,
          getUpdatedAt: (a) => a.lastUpdated,
          getItemId: (a) => a.agentId,
          entityName: "agent (incremental)",
        },
        state
      );
    }

    if (options.syncSkills !== false) {
      await syncEntity(
        {
          source: listAllSkills(client),
          transform: transformCxoneSkill,
          context,
          getUpdatedAt: (s) => s.lastUpdateTime,
          getItemId: (s) => s.skillId,
          entityName: "skill (incremental)",
        },
        state
      );
    }

    if (options.syncTeams !== false) {
      await syncEntity(
        {
          source: listAllTeams(client),
          transform: transformCxoneTeam,
          context,
          getUpdatedAt: (t) => t.lastUpdateTime,
          getItemId: (t) => t.teamId,
          entityName: "team (incremental)",
        },
        state
      );
    }

    if (options.syncCampaigns !== false) {
      await syncEntity(
        {
          source: listAllCampaigns(client),
          transform: transformCxoneCampaign,
          context,
          getUpdatedAt: (c) => c.lastUpdateTime,
          getItemId: (c) => c.campaignId,
          entityName: "campaign (incremental)",
        },
        state
      );
    }

    yield {
      items: state.documents,
      cursor: {
        lastSyncTime: state.latestModified,
        lastFullSync: cursor.lastFullSync,
      },
      hasMore: false,
      stats: { processed: state.processed, skipped: 0, errors: state.errors },
    };
  } catch (error) {
    logger.warn(
      { error },
      "NICE CXone incremental sync failed, falling back to full"
    );
    yield* niceCxoneFullSync(client, context, options);
  }
}
