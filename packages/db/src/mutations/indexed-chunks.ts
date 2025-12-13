import type { Database } from "../index";

export interface CreateIndexedChunkInput {
  fileId: string;
  connectorId: string;
  vespaId: string;
  chunkIndex: number;
  checksum: string;
  contentLength: number;
}

export const createIndexedChunks = async (
  db: Database,
  chunks: CreateIndexedChunkInput[]
): Promise<{ count: number }> =>
  db.indexedChunk.createMany({
    data: chunks,
    skipDuplicates: true,
  });

export const deleteChunksByFileId = async (
  db: Database,
  fileId: string
): Promise<{ count: number }> =>
  db.indexedChunk.deleteMany({ where: { fileId } });

export const deleteChunksByConnector = async (
  db: Database,
  connectorId: string
): Promise<{ count: number }> =>
  db.indexedChunk.deleteMany({ where: { connectorId } });
