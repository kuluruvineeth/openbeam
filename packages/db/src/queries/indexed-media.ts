import type { IndexedMedia } from "../../prisma/generated/client";
import type { Database } from "../index";

const connectorInclude = {
  connector: { select: { teamId: true, app: true, workspaceExternalId: true } },
} as const;

export type IndexedMediaWithConnector = IndexedMedia & {
  connector: { teamId: string; app: string; workspaceExternalId: string };
};

export const findIndexedMediaById = async (
  db: Database,
  id: string
): Promise<IndexedMedia | null> =>
  db.indexedMedia.findUnique({ where: { id } });

export const findIndexedMediaByVespaId = async (
  db: Database,
  vespaId: string
): Promise<IndexedMediaWithConnector | null> =>
  db.indexedMedia.findUnique({
    where: { vespaId },
    include: connectorInclude,
  });

export const findIndexedMediaByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<IndexedMedia | null> =>
  db.indexedMedia.findUnique({
    where: { connectorId_externalId: { connectorId, externalId } },
  });

export const findIndexedMediaForPreview = async (
  db: Database,
  params: {
    connectorId?: string;
    externalId?: string;
    vespaId?: string;
    id?: string;
  }
): Promise<(IndexedMedia & { connector: { teamId: string } }) | null> => {
  const { connectorId, externalId, vespaId, id } = params;

  if (connectorId && externalId) {
    const result = await db.indexedMedia.findFirst({
      where: { connectorId, externalId },
      include: { connector: { select: { teamId: true } } },
    });
    if (result) {
      return result;
    }
  }

  if (vespaId) {
    const result = await db.indexedMedia.findUnique({
      where: { vespaId },
      include: { connector: { select: { teamId: true } } },
    });
    if (result) {
      return result;
    }
  }

  if (id) {
    return db.indexedMedia.findUnique({
      where: { id },
      include: { connector: { select: { teamId: true } } },
    });
  }

  return null;
};

export const findIndexedMediasByConnector = async (
  db: Database,
  connectorId: string,
  options?: { take?: number; skip?: number }
): Promise<IndexedMedia[]> =>
  db.indexedMedia.findMany({
    where: { connectorId },
    take: options?.take,
    skip: options?.skip,
    orderBy: { createdAt: "desc" },
  });

export type TwelveLabsAssetForCleanup = {
  twelveLabsIndexId: string;
  twelveLabsAssetId: string;
};

export const findTwelveLabsAssetsForCleanup = async (
  db: Database,
  connectorId: string
): Promise<TwelveLabsAssetForCleanup[]> => {
  const media = await db.indexedMedia.findMany({
    where: {
      connectorId,
      twelveLabsAssetId: { not: null },
      twelveLabsIndexId: { not: null },
    },
    select: { twelveLabsAssetId: true, twelveLabsIndexId: true },
  });
  return media.filter(
    (m): m is TwelveLabsAssetForCleanup =>
      m.twelveLabsAssetId !== null && m.twelveLabsIndexId !== null
  );
};
