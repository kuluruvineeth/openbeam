import { logger } from "../../lib/logger";
import { callLTR, getLTRHealth } from "./client";
import type {
  DocumentFeatures,
  LTRHealth,
  LTRResponse,
  UserContext,
} from "./types";

export interface LTRConfig {
  enabled: boolean;
  topK: number;
  maxInputDocs: number;
  fallbackOnError: boolean;
  modelVersion?: string;
}

const DEFAULT_CONFIG: LTRConfig = {
  enabled: true,
  topK: 20,
  maxInputDocs: 50,
  fallbackOnError: true,
};

export class LTRService {
  private readonly config: LTRConfig;

  constructor(config?: Partial<LTRConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getEngineUrl(): string | undefined {
    return process.env.ENGINE_URL;
  }

  async score(
    query: string,
    documents: DocumentFeatures[],
    userContext?: UserContext,
    topK?: number
  ): Promise<LTRResponse | null> {
    if (!this.isEnabled() || documents.length === 0) {
      return null;
    }

    const inputDocs = documents.slice(0, this.config.maxInputDocs);
    const requestedTopK = topK ?? this.config.topK;

    try {
      const response = await callLTR({
        query,
        documents: inputDocs,
        userContext,
        topK: requestedTopK,
        modelVersion: this.config.modelVersion,
      });

      logger.debug(
        {
          inputDocs: inputDocs.length,
          outputDocs: response.results.length,
          elapsedMs: response.elapsedMs,
          modelVersion: response.modelVersion,
        },
        "LTR scoring completed"
      );

      return response;
    } catch (error) {
      logger.error(
        {
          error,
          queryLength: query.length,
          docCount: inputDocs.length,
          modelVersion: this.config.modelVersion,
        },
        "LTR scoring failed"
      );

      if (this.config.fallbackOnError) {
        return null;
      }

      throw error;
    }
  }

  async getHealth(): Promise<LTRHealth | null> {
    try {
      return await getLTRHealth();
    } catch (error) {
      logger.debug({ error }, "LTR health check failed");
      return null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled && Boolean(this.getEngineUrl());
  }
}

export const ltrService = new LTRService();
