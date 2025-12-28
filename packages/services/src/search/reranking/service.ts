import { logger } from "../../lib/logger";
import { callRerank, getRerankStats } from "./client";
import type { RerankDocument, RerankResponse, RerankStats } from "./types";

export interface RerankerConfig {
  topK: number;
  maxInputDocs: number;
  fallbackOnError: boolean;
}

const DEFAULT_CONFIG: RerankerConfig = {
  topK: 50,
  maxInputDocs: 100,
  fallbackOnError: true,
};

export class RerankerService {
  private readonly config: RerankerConfig;

  constructor(config?: Partial<RerankerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getEngineUrl(): string | undefined {
    return process.env.ENGINE_URL;
  }

  async rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number
  ): Promise<RerankResponse | null> {
    if (!this.isEnabled() || documents.length === 0) {
      return null;
    }

    const inputDocs = documents.slice(0, this.config.maxInputDocs);
    const requestedTopK = topK ?? this.config.topK;

    try {
      return await callRerank(query, inputDocs, requestedTopK);
    } catch (error) {
      logger.error({ error }, "Rerank failed");

      if (this.config.fallbackOnError) {
        return null;
      }

      throw error;
    }
  }

  async getStats(): Promise<RerankStats | null> {
    try {
      return await getRerankStats();
    } catch {
      return null;
    }
  }

  isEnabled(): boolean {
    return Boolean(this.getEngineUrl());
  }
}

export const rerankerService = new RerankerService();
