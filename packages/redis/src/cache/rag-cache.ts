import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";
import {
  ANSWER_CACHE_TTL,
  CHUNK_CACHE_TTL,
  GROUNDING_CACHE_TTL,
  RAGCacheKeys,
} from "./rag-keys";

export interface CachedAnswer {
  answer: string;
  citations: unknown[];
  groundingScore: number | null;
  confidence: string | null;
  generatedAt: number;
}

export interface CachedChunks {
  documentId: string;
  chunks: Array<{
    id: string;
    content: string;
    startOffset: number;
    endOffset: number;
    tokenCount: number;
  }>;
  cachedAt: number;
}

export interface CachedGrounding {
  claims: Array<{
    claim: string;
    supported: boolean;
    evidenceChunkId: string | null;
    confidence: number;
  }>;
  overallScore: number;
  confidence: string;
  cachedAt: number;
}

export function hashQuery(query: string, teamId: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  return createHash("sha256").update(`${teamId}:${normalized}`).digest("hex");
}

export function hashAnswer(answer: string): string {
  return createHash("sha256").update(answer).digest("hex").slice(0, 16);
}

export class RAGCache {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  async getAnswer(
    teamId: string,
    queryHash: string
  ): Promise<CachedAnswer | null> {
    const client = await this.getClient();
    const key = RAGCacheKeys.answerCache(teamId, queryHash);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedAnswer;
  }

  async setAnswer(
    teamId: string,
    queryHash: string,
    answer: CachedAnswer
  ): Promise<void> {
    const client = await this.getClient();
    const key = RAGCacheKeys.answerCache(teamId, queryHash);
    await client.set(key, JSON.stringify(answer), { EX: ANSWER_CACHE_TTL });
  }

  async getChunks(teamId: string, docId: string): Promise<CachedChunks | null> {
    const client = await this.getClient();
    const key = RAGCacheKeys.chunkCache(teamId, docId);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedChunks;
  }

  async setChunks(
    teamId: string,
    docId: string,
    chunks: CachedChunks
  ): Promise<void> {
    const client = await this.getClient();
    const key = RAGCacheKeys.chunkCache(teamId, docId);
    await client.set(key, JSON.stringify(chunks), { EX: CHUNK_CACHE_TTL });
  }

  async getChunksBatch(
    teamId: string,
    docIds: string[]
  ): Promise<Map<string, CachedChunks>> {
    if (docIds.length === 0) {
      return new Map();
    }

    const client = await this.getClient();
    const keys = docIds.map((id) => RAGCacheKeys.chunkCache(teamId, id));
    const values = await client.mGet(keys);

    const result = new Map<string, CachedChunks>();
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i];
      const data = values[i];
      if (data && docId) {
        result.set(docId, JSON.parse(data) as CachedChunks);
      }
    }
    return result;
  }

  async setChunksBatch(teamId: string, chunks: CachedChunks[]): Promise<void> {
    if (chunks.length === 0) {
      return;
    }

    const client = await this.getClient();
    const pipeline = client.multi();

    for (const chunk of chunks) {
      const key = RAGCacheKeys.chunkCache(teamId, chunk.documentId);
      pipeline.set(key, JSON.stringify(chunk), { EX: CHUNK_CACHE_TTL });
    }

    await pipeline.exec();
  }

  async getGrounding(
    teamId: string,
    answerHash: string
  ): Promise<CachedGrounding | null> {
    const client = await this.getClient();
    const key = RAGCacheKeys.groundingCache(teamId, answerHash);
    const data = await client.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedGrounding;
  }

  async setGrounding(
    teamId: string,
    answerHash: string,
    grounding: CachedGrounding
  ): Promise<void> {
    const client = await this.getClient();
    const key = RAGCacheKeys.groundingCache(teamId, answerHash);
    await client.set(key, JSON.stringify(grounding), {
      EX: GROUNDING_CACHE_TTL,
    });
  }

  async invalidateDocumentChunks(teamId: string, docId: string): Promise<void> {
    const client = await this.getClient();
    const key = RAGCacheKeys.chunkCache(teamId, docId);
    await client.del(key);
  }

  async invalidateTeamAnswers(teamId: string): Promise<void> {
    const client = await this.getClient();
    const pattern = `rag:answer:${teamId}:*`;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  }
}

let instance: RAGCache | null = null;

export function getRAGCache(): RAGCache {
  if (!instance) {
    instance = new RAGCache();
  }
  return instance;
}
