import type {
  NiceCxoneSyncBatch,
  NiceCxoneTransformContext,
} from "@openbeam/types/services/connectors/nice-cxone";
import type { GenericDocument } from "@openbeam/vespa";
import { listAllAgents } from "../api/agents";
import { listAllCampaigns } from "../api/campaigns";
import { listCompletedContacts } from "../api/contacts";
import { listAllSkills } from "../api/skills";
import { listAllTeams } from "../api/teams";
import type { NiceCxoneClient } from "../client";
import { transformCxoneAgent } from "../transformers/agent";
import { transformCxoneCampaign } from "../transformers/campaign";
import { transformCxoneContact } from "../transformers/contact";
import { transformCxoneSkill } from "../transformers/skill";
import { transformCxoneTeam } from "../transformers/team";
import { syncEntity } from "./shared";

type SyncOptions = {
  batchSize?: number;
  lookbackDays?: number;
  syncContacts?: boolean;
  syncAgents?: boolean;
  syncSkills?: boolean;
  syncTeams?: boolean;
  syncCampaigns?: boolean;
};

export async function* niceCxoneFullSync(
  client: NiceCxoneClient,
  context: NiceCxoneTransformContext,
  options: SyncOptions = {}
): AsyncGenerator<NiceCxoneSyncBatch<GenericDocument>, void, undefined> {
  const batchSize = options.batchSize ?? 100;
  const lookbackDays = options.lookbackDays ?? 90;
  const state = {
    documents: [] as GenericDocument[],
    processed: 0,
    errors: 0,
    latestModified: 0,
  };

  if (options.syncContacts !== false) {
    const endDate = new Date().toISOString();
    const startDate = new Date(
      Date.now() - lookbackDays * 24 * 60 * 60 * 1000
    ).toISOString();

    await syncEntity(
      {
        source: listCompletedContacts(client, startDate, endDate),
        transform: transformCxoneContact,
        context,
        getUpdatedAt: (c) => c.lastUpdateTime ?? c.contactEnd ?? c.contactStart,
        getItemId: (c) => c.contactId,
        entityName: "contact",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncAgents !== false) {
    await syncEntity(
      {
        source: listAllAgents(client),
        transform: transformCxoneAgent,
        context,
        getUpdatedAt: (a) => a.lastUpdated,
        getItemId: (a) => a.agentId,
        entityName: "agent",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncSkills !== false) {
    await syncEntity(
      {
        source: listAllSkills(client),
        transform: transformCxoneSkill,
        context,
        getUpdatedAt: (s) => s.lastUpdateTime,
        getItemId: (s) => s.skillId,
        entityName: "skill",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncTeams !== false) {
    await syncEntity(
      {
        source: listAllTeams(client),
        transform: transformCxoneTeam,
        context,
        getUpdatedAt: (t) => t.lastUpdateTime,
        getItemId: (t) => t.teamId,
        entityName: "team",
      },
      state
    );
    if (state.documents.length >= batchSize) {
      yield makeBatch(state, true);
      state.documents = [];
    }
  }

  if (options.syncCampaigns !== false) {
    await syncEntity(
      {
        source: listAllCampaigns(client),
        transform: transformCxoneCampaign,
        context,
        getUpdatedAt: (c) => c.lastUpdateTime,
        getItemId: (c) => c.campaignId,
        entityName: "campaign",
      },
      state
    );
  }

  yield {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore: false,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}

function makeBatch(
  state: {
    documents: GenericDocument[];
    processed: number;
    errors: number;
    latestModified: number;
  },
  hasMore: boolean
): NiceCxoneSyncBatch<GenericDocument> {
  return {
    items: state.documents,
    cursor: {
      lastSyncTime: state.latestModified || Date.now(),
      lastFullSync: Date.now(),
    },
    hasMore,
    stats: { processed: state.processed, skipped: 0, errors: state.errors },
  };
}
