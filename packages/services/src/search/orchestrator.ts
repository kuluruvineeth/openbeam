import { getBGEM3Provider } from "@openplane/ai";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { logger } from "../lib/logger";
import { weightedReciprocalRankFusion } from "./fusion/weighted-rrf";
import { retrieveBM25 } from "./retrieval/bm25";
import { retrieveDense } from "./retrieval/dense";
import { retrieveSparse } from "./retrieval/sparse";
import type {
  HybridSearchRequest,
  HybridSearchResponse,
  RankedDocument,
  RRFConfig,
  SearchTiming,
} from "./types";

const DEFAULT_RRF_CONFIG: RRFConfig = {
  k: 60,
  weights: { bm25: 0.4, dense: 0.4, sparse: 0.2 },
};

const RETRIEVAL_LIMIT_MULTIPLIER = 3;

export class HybridSearchOrchestrator {
  private readonly bge = getBGEM3Provider();

  async search(request: HybridSearchRequest): Promise<HybridSearchResponse> {
    const startTime = performance.now();
    const mode = request.mode ?? "hybrid_v2";
    const rrfConfig = {
      k: request.rrfConfig?.k ?? DEFAULT_RRF_CONFIG.k,
      weights: {
        bm25:
          request.rrfConfig?.weights?.bm25 ?? DEFAULT_RRF_CONFIG.weights.bm25,
        dense:
          request.rrfConfig?.weights?.dense ?? DEFAULT_RRF_CONFIG.weights.dense,
        sparse:
          request.rrfConfig?.weights?.sparse ??
          DEFAULT_RRF_CONFIG.weights.sparse,
      },
    };
    const limit = request.limit ?? 20;
    const retrievalLimit = limit * RETRIEVAL_LIMIT_MULTIPLIER;

    const timing: SearchTiming = {
      embeddingMs: 0,
      retrievalMs: 0,
      fusionMs: 0,
      totalMs: 0,
    };

    const embeddingStart = performance.now();
    const queryEmbedding = await this.bge.embedQuery(request.query);
    timing.embeddingMs = performance.now() - embeddingStart;

    if (mode === "bm25") {
      return this.bm25OnlySearch(request, timing, startTime);
    }

    if (mode === "semantic") {
      return this.semanticOnlySearch(
        request,
        queryEmbedding.dense,
        timing,
        startTime
      );
    }

    const retrievalStart = performance.now();
    const [bm25Results, denseResults, sparseResults] = await Promise.all([
      retrieveBM25({
        query: request.query,
        teamId: request.teamId,
        limit: retrievalLimit,
        filters: request.filters,
        accessControlIds: request.accessControlIds,
      }),
      retrieveDense({
        embedding: queryEmbedding.dense,
        teamId: request.teamId,
        limit: retrievalLimit,
        filters: request.filters,
        accessControlIds: request.accessControlIds,
      }),
      retrieveSparse({
        sparseEmbedding: queryEmbedding.sparse ?? {},
        teamId: request.teamId,
        limit: retrievalLimit,
        filters: request.filters,
        accessControlIds: request.accessControlIds,
      }),
    ]);
    timing.retrievalMs = performance.now() - retrievalStart;

    logger.debug(
      {
        bm25Count: bm25Results.length,
        denseCount: denseResults.length,
        sparseCount: sparseResults.length,
      },
      "Retrieval results"
    );

    const fusionStart = performance.now();
    const fusedResults = weightedReciprocalRankFusion(
      { bm25: bm25Results, dense: denseResults, sparse: sparseResults },
      rrfConfig
    );
    timing.fusionMs = performance.now() - fusionStart;

    const topDocIds = fusedResults
      .slice(request.offset ?? 0, (request.offset ?? 0) + limit)
      .map((r) => r.docId);

    const documents = await this.fetchDocuments(topDocIds);

    const rankedDocuments: RankedDocument[] = topDocIds.flatMap((docId) => {
      const doc = documents.get(docId);
      const fusedResult = fusedResults.find((r) => r.docId === docId);
      if (!(doc && fusedResult)) {
        return [];
      }

      return [
        {
          document: doc,
          score: fusedResult.score,
          bm25Rank: fusedResult.ranks.bm25 ?? undefined,
          denseRank: fusedResult.ranks.dense ?? undefined,
          sparseRank: fusedResult.ranks.sparse ?? undefined,
          rrfScore: fusedResult.score,
        },
      ];
    });

    timing.totalMs = performance.now() - startTime;

    logger.info(
      {
        query: request.query.slice(0, 50),
        mode,
        resultCount: rankedDocuments.length,
        timing,
      },
      "Hybrid search completed"
    );

    return {
      documents: rankedDocuments,
      total: fusedResults.length,
      timing,
      metadata: {
        mode,
        experimentId: request.experimentId,
        modelVersion: "bge-m3",
        rrfK: rrfConfig.k,
      },
    };
  }

  private async bm25OnlySearch(
    request: HybridSearchRequest,
    timing: SearchTiming,
    startTime: number
  ): Promise<HybridSearchResponse> {
    const limit = request.limit ?? 20;

    const retrievalStart = performance.now();
    const results = await retrieveBM25({
      query: request.query,
      teamId: request.teamId,
      limit,
      filters: request.filters,
      accessControlIds: request.accessControlIds,
    });
    timing.retrievalMs = performance.now() - retrievalStart;

    const documents = await this.fetchDocuments(results.map((r) => r.docId));

    const rankedDocuments: RankedDocument[] = results.flatMap((r) => {
      const doc = documents.get(r.docId);
      if (!doc) {
        return [];
      }
      return [{ document: doc, score: r.score, bm25Rank: r.rank }];
    });

    timing.totalMs = performance.now() - startTime;

    return {
      documents: rankedDocuments,
      total: rankedDocuments.length,
      timing,
      metadata: { mode: "bm25", modelVersion: "bge-m3" },
    };
  }

  private async semanticOnlySearch(
    request: HybridSearchRequest,
    embedding: number[],
    timing: SearchTiming,
    startTime: number
  ): Promise<HybridSearchResponse> {
    const limit = request.limit ?? 20;

    const retrievalStart = performance.now();
    const results = await retrieveDense({
      embedding,
      teamId: request.teamId,
      limit,
      filters: request.filters,
      accessControlIds: request.accessControlIds,
    });
    timing.retrievalMs = performance.now() - retrievalStart;

    const documents = await this.fetchDocuments(results.map((r) => r.docId));

    const rankedDocuments: RankedDocument[] = results.flatMap((r) => {
      const doc = documents.get(r.docId);
      if (!doc) {
        return [];
      }
      return [{ document: doc, score: r.score, denseRank: r.rank }];
    });

    timing.totalMs = performance.now() - startTime;

    return {
      documents: rankedDocuments,
      total: rankedDocuments.length,
      timing,
      metadata: { mode: "semantic", modelVersion: "bge-m3" },
    };
  }

  private async fetchDocuments(
    docIds: string[]
  ): Promise<Map<string, GenericDocument>> {
    if (docIds.length === 0) {
      return new Map();
    }

    const results = await Promise.all(
      docIds.map((id) => vespaClient.getDocument(id))
    );

    const map = new Map<string, GenericDocument>();
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i];
      const doc = results[i];
      if (doc && docId) {
        map.set(docId, doc);
      }
    }

    return map;
  }
}

export const hybridSearchOrchestrator = new HybridSearchOrchestrator();
