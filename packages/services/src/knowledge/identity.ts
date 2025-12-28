import type { Database, Entity, EntityType } from "@openplane/db";
import {
  findEntityByAlias,
  getAllEntitiesForResolution,
  getEntityByNormalizedName,
  upsertEntity,
} from "@openplane/db";

export interface ResolvedEntity {
  entity: Entity;
  confidence: number;
  matchType: "exact" | "alias" | "fuzzy";
}

export interface ResolutionContext {
  teamId: string;
  entityType?: EntityType;
}

export async function resolveEntity(
  db: Database,
  mention: string,
  ctx: ResolutionContext
): Promise<ResolvedEntity | null> {
  const normalizedMention = normalizeName(mention);

  if (ctx.entityType) {
    const exactMatch = await getEntityByNormalizedName(
      db,
      ctx.teamId,
      ctx.entityType,
      normalizedMention
    );

    if (exactMatch) {
      return { entity: exactMatch, confidence: 1.0, matchType: "exact" };
    }

    const aliasMatch = await findEntityByAlias(
      db,
      ctx.teamId,
      ctx.entityType,
      normalizedMention
    );

    if (aliasMatch) {
      return { entity: aliasMatch, confidence: 0.95, matchType: "alias" };
    }
  }

  const candidates = await getAllEntitiesForResolution(db, ctx.teamId);

  const filtered = ctx.entityType
    ? candidates.filter((c) => c.type === ctx.entityType)
    : candidates;

  const fuzzyMatch = findBestFuzzyMatch(normalizedMention, filtered);
  if (fuzzyMatch && fuzzyMatch.score > 0.85) {
    const fullEntity = await db.entity.findUnique({
      where: { id: fuzzyMatch.entityId },
    });

    if (fullEntity) {
      return {
        entity: fullEntity,
        confidence: fuzzyMatch.score,
        matchType: "fuzzy",
      };
    }
  }

  return null;
}

export async function resolveOrCreateEntity(
  db: Database,
  mention: string,
  entityType: EntityType,
  ctx: {
    teamId: string;
    externalId?: string;
    externalSource?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Entity> {
  const resolved = await resolveEntity(db, mention, {
    teamId: ctx.teamId,
    entityType,
  });

  if (resolved && resolved.confidence > 0.9) {
    return resolved.entity;
  }

  const normalizedName = normalizeName(mention);

  return upsertEntity(db, {
    teamId: ctx.teamId,
    type: entityType,
    name: mention,
    normalizedName,
    externalId: ctx.externalId,
    externalSource: ctx.externalSource,
    metadata: ctx.metadata,
  });
}

interface EntityForResolution {
  id: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  aliases: string[];
}

interface EntityLookupMaps {
  byNormalizedName: Map<string, EntityForResolution>;
  byAlias: Map<string, EntityForResolution>;
}

function buildEntityLookupMaps(
  entities: EntityForResolution[]
): EntityLookupMaps {
  const byNormalizedName = new Map<string, EntityForResolution>();
  const byAlias = new Map<string, EntityForResolution>();

  for (const entity of entities) {
    byNormalizedName.set(`${entity.type}:${entity.normalizedName}`, entity);
    for (const alias of entity.aliases) {
      byAlias.set(`${entity.type}:${alias}`, entity);
    }
  }

  return { byNormalizedName, byAlias };
}

async function fetchAndCacheEntity(
  db: Database,
  entityId: string,
  cache: Map<string, Entity>
): Promise<Entity | null> {
  const cached = cache.get(entityId);
  if (cached) {
    return cached;
  }

  const entity = await db.entity.findUnique({ where: { id: entityId } });
  if (entity) {
    cache.set(entityId, entity);
  }
  return entity;
}

export async function batchResolveEntities(
  db: Database,
  mentions: Array<{ text: string; type: EntityType }>,
  ctx: ResolutionContext
): Promise<Map<string, ResolvedEntity | null>> {
  const results = new Map<string, ResolvedEntity | null>();
  const allEntities = await getAllEntitiesForResolution(db, ctx.teamId);
  const { byNormalizedName, byAlias } = buildEntityLookupMaps(allEntities);
  const entityCache = new Map<string, Entity>();

  const resolveCtx: ResolveMentionContext = {
    db,
    allEntities,
    lookupMaps: { byNormalizedName, byAlias },
    cache: entityCache,
  };

  for (const { text, type } of mentions) {
    const resolved = await resolveSingleMention(text, type, resolveCtx);
    results.set(text, resolved);
  }

  return results;
}

interface ResolveMentionContext {
  db: Database;
  allEntities: EntityForResolution[];
  lookupMaps: EntityLookupMaps;
  cache: Map<string, Entity>;
}

async function resolveSingleMention(
  text: string,
  type: EntityType,
  ctx: ResolveMentionContext
): Promise<ResolvedEntity | null> {
  const normalized = normalizeName(text);
  const key = `${type}:${normalized}`;
  const { db, allEntities, lookupMaps, cache } = ctx;

  const exact = lookupMaps.byNormalizedName.get(key);
  if (exact) {
    const entity = await fetchAndCacheEntity(db, exact.id, cache);
    if (entity) {
      return { entity, confidence: 1.0, matchType: "exact" };
    }
  }

  const alias = lookupMaps.byAlias.get(key);
  if (alias) {
    const entity = await fetchAndCacheEntity(db, alias.id, cache);
    if (entity) {
      return { entity, confidence: 0.95, matchType: "alias" };
    }
  }

  const sameType = allEntities.filter((e) => e.type === type);
  const fuzzy = findBestFuzzyMatch(normalized, sameType);
  if (fuzzy && fuzzy.score > 0.85) {
    const entity = await fetchAndCacheEntity(db, fuzzy.entityId, cache);
    if (entity) {
      return { entity, confidence: fuzzy.score, matchType: "fuzzy" };
    }
  }

  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function findBestFuzzyMatch(
  target: string,
  candidates: EntityForResolution[]
): { entityId: string; score: number } | null {
  let best: { entityId: string; score: number } | null = null;

  for (const candidate of candidates) {
    const score = levenshteinSimilarity(target, candidate.normalizedName);
    if (!best || score > best.score) {
      best = { entityId: candidate.id, score };
    }

    for (const alias of candidate.aliases) {
      const aliasScore = levenshteinSimilarity(target, alias);
      if (!best || aliasScore > best.score) {
        best = { entityId: candidate.id, score: aliasScore };
      }
    }
  }

  return best;
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) {
    return 1;
  }
  if (!(a && b)) {
    return 0;
  }

  const aLen = a.length;
  const bLen = b.length;
  const rows = new Uint16Array((aLen + 1) * 2);

  for (let j = 0; j <= aLen; j++) {
    rows[j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    const prevOffset = ((i - 1) % 2) * (aLen + 1);
    const currOffset = (i % 2) * (aLen + 1);
    const bChar = b.charCodeAt(i - 1);

    rows[currOffset] = i;
    for (let j = 1; j <= aLen; j++) {
      const cost = bChar === a.charCodeAt(j - 1) ? 0 : 1;
      rows[currOffset + j] = Math.min(
        (rows[prevOffset + j - 1] ?? 0) + cost,
        (rows[currOffset + j - 1] ?? 0) + 1,
        (rows[prevOffset + j] ?? 0) + 1
      );
    }
  }

  const finalOffset = (bLen % 2) * (aLen + 1);
  const distance = rows[finalOffset + aLen] ?? 0;
  const maxLen = Math.max(aLen, bLen);
  return 1 - distance / maxLen;
}
