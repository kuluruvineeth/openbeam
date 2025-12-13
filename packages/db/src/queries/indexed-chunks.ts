import type { IndexedChunk } from "../../prisma/generated/client";
import type { Database } from "../index";

export const findChunksByFileId = async (
  db: Database,
  fileId: string
): Promise<Pick<IndexedChunk, "vespaId">[]> =>
  db.indexedChunk.findMany({
    where: { fileId },
    select: { vespaId: true },
  });

export const findChunksByConnector = async (
  db: Database,
  connectorId: string,
  options?: { take?: number }
): Promise<IndexedChunk[]> =>
  db.indexedChunk.findMany({
    where: { connectorId },
    take: options?.take,
    orderBy: { createdAt: "desc" },
  });

export const countChunksByFileId = async (
  db: Database,
  fileId: string
): Promise<number> => db.indexedChunk.count({ where: { fileId } });
