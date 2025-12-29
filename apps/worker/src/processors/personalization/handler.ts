import prisma, {
  findUserSearchProfile,
  updateConnectorWeights,
} from "@openplane/db";
import {
  type ClickEventPayload,
  ClickEventPayloadSchema,
  type FeedbackEventPayload,
  FeedbackEventPayloadSchema,
  getUserProfileCache,
  ProfileUpdateJobDataSchema,
  type SearchEventPayload,
  SearchEventPayloadSchema,
} from "@openplane/redis";
import {
  updateDocEmbedding,
  updateQueryEmbedding,
} from "@openplane/services/personalization/embeddings";
import type { Job } from "bullmq";
import logger from "../../utils/logger";

const cache = getUserProfileCache();

const CONNECTOR_TYPE_REGEX = /^([^:]+):/;

interface ProfileUpdateResult {
  success: boolean;
}

export async function processProfileUpdate(
  job: Job<unknown>
): Promise<ProfileUpdateResult> {
  const parseResult = ProfileUpdateJobDataSchema.safeParse(job.data);
  if (!parseResult.success) {
    logger.error(
      { error: parseResult.error, jobId: job.id },
      "Invalid job data schema"
    );
    throw new Error(`Invalid job data: ${parseResult.error.message}`);
  }

  const { type, userId, teamId, payload } = parseResult.data;

  const log = logger.child({
    jobId: job.id,
    type,
    userId,
    teamId,
  });

  log.debug("Processing profile update");

  const lockToken = await cache.acquireUpdateLock(teamId, userId);
  if (!lockToken) {
    log.warn("Failed to acquire update lock, skipping");
    return { success: true };
  }

  try {
    switch (type) {
      case "search": {
        const searchPayload = SearchEventPayloadSchema.parse(payload);
        await handleSearchEvent(userId, teamId, searchPayload, log);
        break;
      }
      case "click": {
        const clickPayload = ClickEventPayloadSchema.parse(payload);
        await handleClickEvent(userId, teamId, clickPayload, log);
        break;
      }
      case "feedback": {
        const feedbackPayload = FeedbackEventPayloadSchema.parse(payload);
        await handleFeedbackEvent(userId, teamId, feedbackPayload, log);
        break;
      }
      default: {
        const exhaustiveCheck: never = type;
        log.warn({ type: exhaustiveCheck }, "Unknown profile update type");
      }
    }

    return { success: true };
  } finally {
    await cache.invalidateProfile(teamId, userId);
    await cache.releaseUpdateLock(teamId, userId, lockToken);
  }
}

async function handleSearchEvent(
  userId: string,
  teamId: string,
  payload: SearchEventPayload,
  log: typeof logger
): Promise<void> {
  log.debug({ query: payload.query.slice(0, 50) }, "Updating query embedding");

  await updateQueryEmbedding(
    { db: prisma, userId, teamId },
    payload.queryEmbedding,
    payload.query
  );
}

async function handleClickEvent(
  userId: string,
  teamId: string,
  payload: ClickEventPayload,
  log: typeof logger
): Promise<void> {
  log.debug(
    { docId: payload.docId, position: payload.position },
    "Updating doc embedding"
  );

  await updateDocEmbedding(
    { db: prisma, userId, teamId },
    payload.docEmbedding,
    {
      docId: payload.docId,
      connectorType: payload.connectorType,
      authorId: payload.authorId,
      topicIds: payload.topicIds,
      dwellMs: payload.dwellMs,
      timestamp: Date.now(),
    }
  );
}

async function handleFeedbackEvent(
  userId: string,
  teamId: string,
  payload: FeedbackEventPayload,
  log: typeof logger
): Promise<void> {
  log.debug(
    { docId: payload.docId, feedbackType: payload.feedbackType },
    "Processing feedback"
  );

  const multiplier = payload.feedbackType === "helpful" ? 2 : -1;

  const connectorType = extractConnectorType(payload.docId);
  if (!connectorType) {
    log.warn({ docId: payload.docId }, "Could not extract connector type");
    return;
  }

  const profile = await findUserSearchProfile(prisma, userId, teamId);
  if (!profile) {
    log.debug("No profile found for feedback update");
    return;
  }

  const connectorWeights = { ...profile.connectorWeights };
  connectorWeights[connectorType] = Math.max(
    0,
    (connectorWeights[connectorType] ?? 0) + multiplier
  );

  await updateConnectorWeights(prisma, userId, teamId, connectorWeights);
}

function extractConnectorType(docId: string): string | null {
  const match = docId.match(CONNECTOR_TYPE_REGEX);
  return match?.[1] ?? null;
}
