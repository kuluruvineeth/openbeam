import { createHash } from "node:crypto";
import type { Prisma } from "../../prisma/generated/client";
import type { Database } from "../index";

export interface RecordImpressionInput {
  teamId: string;
  userId: string;
  query: string;
  resultDocIds: string[];
  experimentId?: string | null;
  variant?: string | null;
  timing?: Record<string, number> | null;
  rrfConfig?: Record<string, unknown> | null;
  mode?: string;
}

export async function recordSearchImpression(
  db: Database,
  data: RecordImpressionInput
) {
  const queryHash = createHash("sha256")
    .update(data.query.toLowerCase().trim())
    .digest("hex")
    .slice(0, 16);

  const impression = await db.searchImpression.create({
    data: {
      teamId: data.teamId,
      userId: data.userId,
      experimentId: data.experimentId ?? null,
      variant: data.variant ?? null,
      query: data.query,
      queryHash,
      resultDocIds: data.resultDocIds,
      timing: data.timing as Prisma.InputJsonValue | undefined,
      rrfConfig: data.rrfConfig as Prisma.InputJsonValue | undefined,
    },
  });
  return impression;
}

export interface RecordClickInput {
  impressionId: string;
  docId: string;
  position: number;
  dwellTimeMs?: number | null;
  feedbackType?: string | null;
}

export function recordSearchClick(db: Database, data: RecordClickInput) {
  return db.searchClick.create({
    data: {
      impressionId: data.impressionId,
      docId: data.docId,
      position: data.position,
      dwellTimeMs: data.dwellTimeMs ?? null,
      feedbackType: data.feedbackType ?? null,
    },
  });
}

export function updateSearchClickDwellTime(
  db: Database,
  data: {
    impressionId: string;
    docId: string;
    dwellTimeMs: number;
  }
) {
  return db.searchClick.updateMany({
    where: {
      impressionId: data.impressionId,
      docId: data.docId,
    },
    data: {
      dwellTimeMs: data.dwellTimeMs,
    },
  });
}

export function updateSearchClickFeedback(
  db: Database,
  data: {
    impressionId: string;
    docId: string;
    feedbackType: string;
  }
) {
  return db.searchClick.updateMany({
    where: {
      impressionId: data.impressionId,
      docId: data.docId,
    },
    data: {
      feedbackType: data.feedbackType,
    },
  });
}

export function getImpressionById(db: Database, impressionId: string) {
  return db.searchImpression.findUnique({
    where: { id: impressionId },
  });
}

export function getUserSearchProfile(
  db: Database,
  userId: string,
  teamId: string
) {
  return db.userSearchProfile.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
  });
}

export interface UpsertUserProfileInput {
  userId: string;
  teamId: string;
  department?: string | null;
  searchCount?: number;
  clickCount?: number;
  avgDwellMs?: number | null;
  connectorWeights?: Record<string, number>;
  authorInteractions?: Record<string, number>;
}

export function upsertUserSearchProfile(
  db: Database,
  data: UpsertUserProfileInput
) {
  return db.userSearchProfile.upsert({
    where: {
      userId_teamId: { userId: data.userId, teamId: data.teamId },
    },
    update: {
      department: data.department,
      searchCount: data.searchCount,
      clickCount: data.clickCount,
      avgDwellMs: data.avgDwellMs,
      connectorWeights: data.connectorWeights as Prisma.InputJsonValue,
      authorInteractions: data.authorInteractions as Prisma.InputJsonValue,
    },
    create: {
      userId: data.userId,
      teamId: data.teamId,
      department: data.department,
      searchCount: data.searchCount ?? 0,
      clickCount: data.clickCount ?? 0,
      avgDwellMs: data.avgDwellMs,
      connectorWeights: (data.connectorWeights ?? {}) as Prisma.InputJsonValue,
      authorInteractions: (data.authorInteractions ??
        {}) as Prisma.InputJsonValue,
    },
  });
}

export interface CreateLTRModelInput {
  teamId: string;
  version: string;
  storagePath: string;
  status?: string;
  metrics?: Record<string, number>;
  featureImportance?: Record<string, number>;
  trainingSamples?: number;
  trainingQueries?: number;
  trainingDurationMs?: number;
}

export function createLTRModel(db: Database, data: CreateLTRModelInput) {
  return db.lTRModel.create({
    data: {
      teamId: data.teamId,
      version: data.version,
      storagePath: data.storagePath,
      status: data.status ?? "training",
      metrics: (data.metrics ?? {}) as Prisma.InputJsonValue,
      featureImportance: (data.featureImportance ??
        {}) as Prisma.InputJsonValue,
      trainingSamples: data.trainingSamples ?? 0,
      trainingQueries: data.trainingQueries ?? 0,
      trainingDurationMs: data.trainingDurationMs ?? 0,
    },
  });
}

export function updateLTRModelStatus(
  db: Database,
  id: string,
  status: string,
  deployedAt?: Date
) {
  return db.lTRModel.update({
    where: { id },
    data: {
      status,
      deployedAt,
    },
  });
}

export function getLTRModelByVersion(
  db: Database,
  teamId: string,
  version: string
) {
  return db.lTRModel.findUnique({
    where: {
      teamId_version: { teamId, version },
    },
  });
}

export function getLatestDeployedLTRModel(db: Database, teamId: string) {
  return db.lTRModel.findFirst({
    where: {
      teamId,
      status: "deployed",
    },
    orderBy: {
      deployedAt: "desc",
    },
  });
}

export interface UpdateLTRModelInput {
  status?: string;
  storagePath?: string;
  metrics?: Record<string, number>;
  featureImportance?: Record<string, number>;
  trainingSamples?: number;
  trainingQueries?: number;
  trainingDurationMs?: number;
  deployedAt?: Date;
}

export function updateLTRModel(
  db: Database,
  id: string,
  data: UpdateLTRModelInput
) {
  return db.lTRModel.update({
    where: { id },
    data: {
      status: data.status,
      storagePath: data.storagePath,
      metrics: data.metrics as Prisma.InputJsonValue | undefined,
      featureImportance: data.featureImportance as
        | Prisma.InputJsonValue
        | undefined,
      trainingSamples: data.trainingSamples,
      trainingQueries: data.trainingQueries,
      trainingDurationMs: data.trainingDurationMs,
      deployedAt: data.deployedAt,
    },
  });
}
