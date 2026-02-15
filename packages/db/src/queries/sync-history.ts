import type { Database } from "../index";

export const findScheduledSyncJob = async (
  db: Database,
  connectorId: string,
  type: "FULL" | "INCREMENTAL" | "PERMISSIONS"
) =>
  db.syncJob.findFirst({
    where: {
      connectorId,
      type,
      trigger: "SCHEDULED",
      deletedAt: null,
    },
    select: { id: true },
  });

export const getSyncHistoryById = async (db: Database, syncHistoryId: string) =>
  db.syncHistory.findUnique({
    where: { id: syncHistoryId },
    select: { id: true, syncJobId: true, status: true },
  });

export const getSyncJobWithConfig = async (db: Database, syncJobId: string) =>
  db.syncJob.findUnique({
    where: { id: syncJobId },
    select: { id: true, config: true },
  });

export const listConnectorSyncHistoryEntries = async (
  db: Database,
  connectorId: string,
  options: { take: number; skip?: number }
) =>
  db.syncHistory.findMany({
    where: { connectorId },
    orderBy: { startedAt: "desc" },
    take: options.take,
    skip: options.skip ?? 0,
    select: {
      id: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      dataAdded: true,
      dataUpdated: true,
      dataDeleted: true,
      dataSkipped: true,
      errorMessage: true,
    },
  });

export const countConnectorSyncHistoryEntries = async (
  db: Database,
  connectorId: string
) =>
  db.syncHistory.count({
    where: { connectorId },
  });

export const findSyncHistoryWithItemsById = async (
  db: Database,
  syncHistoryId: string
) =>
  db.syncHistory.findUnique({
    where: { id: syncHistoryId },
    select: {
      connectorId: true,
      status: true,
      dataAdded: true,
      dataUpdated: true,
      dataDeleted: true,
      dataSkipped: true,
      startedAt: true,
      finishedAt: true,
      errorMessage: true,
      syncJob: {
        select: { itemsTotal: true },
      },
    },
  });

export const getSyncCursor = async (
  db: Database,
  connectorId: string,
  resource: string
) =>
  db.syncCursor.findUnique({
    where: {
      connectorId_resource: { connectorId, resource },
    },
    select: { cursor: true, lastSyncedAt: true },
  });
