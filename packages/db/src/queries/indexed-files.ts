import type { IndexedFile } from "../../prisma/generated/client";
import type { Database } from "../index";

const connectorInclude = {
  connector: { select: { teamId: true, app: true, workspaceExternalId: true } },
} as const;

export type IndexedFileWithConnector = IndexedFile & {
  connector: { teamId: string; app: string; workspaceExternalId: string };
};

export const findIndexedFileById = async (
  db: Database,
  id: string
): Promise<IndexedFileWithConnector | null> =>
  db.indexedFile.findUnique({
    where: { id },
    include: connectorInclude,
  });

export const findIndexedFileByVespaId = async (
  db: Database,
  vespaId: string
): Promise<IndexedFileWithConnector | null> =>
  db.indexedFile.findUnique({
    where: { vespaId },
    include: connectorInclude,
  });

export const findIndexedFileByExternalId = async (
  db: Database,
  connectorId: string,
  externalId: string
): Promise<IndexedFile | null> =>
  db.indexedFile.findUnique({
    where: { connectorId_externalId: { connectorId, externalId } },
  });

export const findIndexedFileForPreview = async (
  db: Database,
  params: {
    connectorId?: string;
    externalId?: string;
    vespaId?: string;
    id?: string;
  }
): Promise<(IndexedFile & { connector: { teamId: string } }) | null> => {
  const { connectorId, externalId, vespaId, id } = params;

  if (connectorId && externalId) {
    const result = await db.indexedFile.findFirst({
      where: { connectorId, externalId },
      include: { connector: { select: { teamId: true } } },
    });
    if (result) {
      return result;
    }
  }

  if (vespaId) {
    const result = await db.indexedFile.findUnique({
      where: { vespaId },
      include: { connector: { select: { teamId: true } } },
    });
    if (result) {
      return result;
    }
  }

  if (id) {
    return db.indexedFile.findUnique({
      where: { id },
      include: { connector: { select: { teamId: true } } },
    });
  }

  return null;
};

export const findIndexedFilesByConnector = async (
  db: Database,
  connectorId: string,
  options?: { take?: number; skip?: number }
): Promise<IndexedFile[]> =>
  db.indexedFile.findMany({
    where: { connectorId },
    take: options?.take,
    skip: options?.skip,
    orderBy: { createdAt: "desc" },
  });
