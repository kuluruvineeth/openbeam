import {
  type Database,
  findEntityByTeamTypeAndExternalId,
  findUserSearchProfile,
  listAllExpertiseRelationsByPerson,
  updateTopicWeights,
} from "@openbeam/db";
import { getUserProfileCache } from "@openbeam/redis";

interface TopicAffinityContext {
  db: Database;
  userId: string;
  teamId: string;
}

const EXPERTISE_WEIGHT = 2.0;
const CLICK_WEIGHT = 1.0;
const MENTION_DECAY = 0.9;

export async function computeTopicAffinity(
  ctx: TopicAffinityContext
): Promise<Record<string, number>> {
  const [clickedTopics, authoredTopics] = await Promise.all([
    getTopicsFromClicks(ctx),
    getTopicsFromAuthorship(ctx),
  ]);

  const affinityMap: Record<string, number> = {};

  for (const [topicId, weight] of Object.entries(clickedTopics)) {
    affinityMap[topicId] = (affinityMap[topicId] ?? 0) + weight * CLICK_WEIGHT;
  }

  for (const [topicId, weight] of Object.entries(authoredTopics)) {
    affinityMap[topicId] =
      (affinityMap[topicId] ?? 0) + weight * EXPERTISE_WEIGHT;
  }

  return normalizeWeights(affinityMap);
}

async function getTopicsFromClicks(
  ctx: TopicAffinityContext
): Promise<Record<string, number>> {
  const profile = await findUserSearchProfile(ctx.db, ctx.userId, ctx.teamId);

  if (!profile || profile.recentClicks.length === 0) {
    return {};
  }

  const topicCounts: Record<string, number> = {};
  const now = Date.now();

  for (const click of profile.recentClicks) {
    const ageHours = (now - click.timestamp) / (1000 * 60 * 60);
    const decay = MENTION_DECAY ** (ageHours / 24);

    for (const topicId of click.topicIds) {
      topicCounts[topicId] = (topicCounts[topicId] ?? 0) + decay;
    }
  }

  return topicCounts;
}

async function getTopicsFromAuthorship(
  ctx: TopicAffinityContext
): Promise<Record<string, number>> {
  const userEntity = await findEntityByTeamTypeAndExternalId(
    ctx.db,
    ctx.teamId,
    "PERSON",
    ctx.userId
  );

  if (!userEntity) {
    return {};
  }

  const expertiseRelations = await listAllExpertiseRelationsByPerson(
    ctx.db,
    userEntity.id
  );

  const topicWeights: Record<string, number> = {};

  for (const relation of expertiseRelations) {
    if (relation.toEntity.type === "TOPIC") {
      topicWeights[relation.toEntityId] = relation.weight * relation.confidence;
    }
  }

  return topicWeights;
}

function normalizeWeights(
  weights: Record<string, number>
): Record<string, number> {
  const values = Object.values(weights);
  if (values.length === 0) {
    return {};
  }

  const maxWeight = Math.max(...values);
  if (maxWeight === 0) {
    return weights;
  }

  const normalized: Record<string, number> = {};
  for (const [key, value] of Object.entries(weights)) {
    normalized[key] = value / maxWeight;
  }

  return normalized;
}

export async function updateTopicAffinity(
  ctx: TopicAffinityContext
): Promise<void> {
  const topicWeights = await computeTopicAffinity(ctx);

  await updateTopicWeights(ctx.db, ctx.userId, ctx.teamId, topicWeights);

  const cache = getUserProfileCache();
  await cache.invalidateProfile(ctx.teamId, ctx.userId);
}
