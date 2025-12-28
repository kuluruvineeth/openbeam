import { getBGEM3Provider } from "@openplane/ai";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { logger } from "../lib/logger";
import { weightedReciprocalRankFusion } from "./fusion/weighted-rrf";
import type { DocumentFeatures, LTRResult } from "./ltr";
import { ltrService } from "./ltr";
import type { RerankDocument, RerankResponse } from "./reranking";
import { rerankerService } from "./reranking";
import { retrieveBM25 } from "./retrieval/bm25";
import { retrieveDense } from "./retrieval/dense";
import { retrieveSparse } from "./retrieval/sparse";
import type {
  HybridSearchRequest,
  HybridSearchResponse,
  RankedDocument,
  RRFConfig,
  SearchMode,
  SearchTiming,
} from "./types";

const DEFAULT_RRF_CONFIG: RRFConfig = {
  k: 60,
  weights: { bm25: 0.4, dense: 0.4, sparse: 0.2 },
};

const RETRIEVAL_LIMIT_MULTIPLIER = 3;
const RERANK_CANDIDATES = 100;
const RERANK_TOP_K_MULTIPLIER = 2;
const LTR_CANDIDATES = 50;

interface WeightedRRFOutput {
  docId: string;
  score: number;
  components: { bm25: number; dense: number; sparse: number };
  ranks: { bm25: number | null; dense: number | null; sparse: number | null };
}

interface HybridSearchContext {
  request: HybridSearchRequest;
  mode: SearchMode;
  limit: number;
  rrfConfig: RRFConfig;
  timing: SearchTiming;
  startTime: number;
}

export class HybridSearchOrchestrator {
  private readonly bge = getBGEM3Provider();

  async search(request: HybridSearchRequest): Promise<HybridSearchResponse> {
    const startTime = performance.now();
    const mode = request.mode ?? "hybrid_v2";
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

    const ctx: HybridSearchContext = {
      request,
      mode,
      limit: request.limit ?? 20,
      rrfConfig: this.buildRRFConfig(request.rrfConfig),
      timing,
      startTime,
    };

    return this.hybridSearch(ctx, queryEmbedding);
  }

  private buildRRFConfig(config?: Partial<RRFConfig>): RRFConfig {
    return {
      k: config?.k ?? DEFAULT_RRF_CONFIG.k,
      weights: {
        bm25: config?.weights?.bm25 ?? DEFAULT_RRF_CONFIG.weights.bm25,
        dense: config?.weights?.dense ?? DEFAULT_RRF_CONFIG.weights.dense,
        sparse: config?.weights?.sparse ?? DEFAULT_RRF_CONFIG.weights.sparse,
      },
    };
  }

  private async hybridSearch(
    ctx: HybridSearchContext,
    queryEmbedding: { dense: number[]; sparse?: Record<string, number> | null }
  ): Promise<HybridSearchResponse> {
    const { request, mode, limit, rrfConfig, timing } = ctx;
    const useReranking =
      mode === "hybrid_v2_rerank" ||
      mode === "enterprise_v2" ||
      mode === "enterprise_v2_ltr";
    const useLTR = mode === "enterprise_v2_ltr";
    const retrievalLimit = useReranking
      ? Math.max(RERANK_CANDIDATES, limit * RETRIEVAL_LIMIT_MULTIPLIER)
      : limit * RETRIEVAL_LIMIT_MULTIPLIER;

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

    const { rerankedResults, rerankModel } = await this.maybeRerank({
      useReranking,
      query: request.query,
      fusedResults,
      limit,
      timing,
    });

    const { ltrResults, ltrModelVersion } = await this.maybeLTR({
      useLTR,
      query: request.query,
      fusedResults,
      rerankedResults,
      limit,
      timing,
    });

    return this.buildHybridResponse({
      ctx,
      fusedResults,
      rerankedResults,
      rerankModel,
      ltrResults,
      ltrModelVersion,
    });
  }

  private async maybeRerank(opts: {
    useReranking: boolean;
    query: string;
    fusedResults: WeightedRRFOutput[];
    limit: number;
    timing: SearchTiming;
  }): Promise<{
    rerankedResults: Array<WeightedRRFOutput & { rerankScore: number }> | null;
    rerankModel: string | undefined;
  }> {
    const { useReranking, query, fusedResults, limit, timing } = opts;
    if (!(useReranking && rerankerService.isEnabled())) {
      return { rerankedResults: null, rerankModel: undefined };
    }

    const rerankStart = performance.now();

    const candidatesToRerank = fusedResults.slice(
      0,
      Math.min(RERANK_CANDIDATES, fusedResults.length)
    );
    const candidateDocIds = candidatesToRerank.map((r) => r.docId);
    const candidateDocs = await this.fetchDocuments(candidateDocIds);

    const documentsToRerank = this.prepareForReranking(
      candidatesToRerank,
      candidateDocs
    );

    const rerankResponse = await rerankerService.rerank(
      query,
      documentsToRerank,
      limit * RERANK_TOP_K_MULTIPLIER
    );

    if (!rerankResponse) {
      return { rerankedResults: null, rerankModel: undefined };
    }

    timing.rerankMs = performance.now() - rerankStart;

    return {
      rerankedResults: this.applyRerankScores(fusedResults, rerankResponse),
      rerankModel: rerankResponse.model,
    };
  }

  private async maybeLTR(opts: {
    useLTR: boolean;
    query: string;
    fusedResults: WeightedRRFOutput[];
    rerankedResults: Array<WeightedRRFOutput & { rerankScore: number }> | null;
    limit: number;
    timing: SearchTiming;
  }): Promise<{
    ltrResults: LTRResult[] | null;
    ltrModelVersion: string | undefined;
  }> {
    const { useLTR, query, fusedResults, rerankedResults, limit, timing } =
      opts;
    if (!(useLTR && ltrService.isEnabled())) {
      return { ltrResults: null, ltrModelVersion: undefined };
    }

    const ltrStart = performance.now();

    const sourceResults = rerankedResults ?? fusedResults;
    const candidatesForLTR = sourceResults.slice(
      0,
      Math.min(LTR_CANDIDATES, sourceResults.length)
    );

    const documentFeatures: DocumentFeatures[] = candidatesForLTR.map(
      (result) => {
        const rerankScore =
          rerankedResults?.find((r) => r.docId === result.docId)?.rerankScore ??
          0;

        return {
          docId: result.docId,
          bm25Title: result.components.bm25,
          bm25Content: result.components.bm25,
          denseScore: result.components.dense,
          sparseScore: result.components.sparse,
          rerankScore,
          recencyDays: 0,
          docLength: 0,
          titleLength: 0,
          viewCount: 0,
          reactionCount: 0,
          replyCount: 0,
          trendingScore: 0,
          authorityScore: 0,
          titleExactMatch: false,
          titlePartialMatch: false,
          connectorType: "unknown",
          documentType: "unknown",
          departmentMatch: false,
          authorInteractionCount: 0,
        };
      }
    );

    const ltrResponse = await ltrService.score(
      query,
      documentFeatures,
      undefined,
      limit
    );

    if (!ltrResponse) {
      return { ltrResults: null, ltrModelVersion: undefined };
    }

    timing.ltrMs = performance.now() - ltrStart;

    return {
      ltrResults: ltrResponse.results,
      ltrModelVersion: ltrResponse.modelVersion,
    };
  }

  private async buildHybridResponse(options: {
    ctx: HybridSearchContext;
    fusedResults: WeightedRRFOutput[];
    rerankedResults: Array<WeightedRRFOutput & { rerankScore: number }> | null;
    rerankModel: string | undefined;
    ltrResults: LTRResult[] | null;
    ltrModelVersion: string | undefined;
  }): Promise<HybridSearchResponse> {
    const {
      ctx,
      fusedResults,
      rerankedResults,
      rerankModel,
      ltrResults,
      ltrModelVersion,
    } = options;
    const { request, mode, limit, rrfConfig, timing, startTime } = ctx;
    const offset = request.offset ?? 0;

    let topDocIds: string[];
    if (ltrResults) {
      topDocIds = ltrResults.slice(offset, offset + limit).map((r) => r.docId);
    } else {
      const finalResults = rerankedResults ?? fusedResults;
      topDocIds = finalResults
        .slice(offset, offset + limit)
        .map((r) => r.docId);
    }

    const documents = await this.fetchDocuments(topDocIds);

    const rerankScoreMap = rerankedResults
      ? new Map(rerankedResults.map((r) => [r.docId, r.rerankScore]))
      : null;

    const ltrScoreMap = ltrResults
      ? new Map(
          ltrResults.map((r, idx) => [
            r.docId,
            { score: r.score, rank: idx + 1, features: r.features },
          ])
        )
      : null;

    const rankedDocuments = this.buildRankedDocuments({
      topDocIds,
      documents,
      fusedResults,
      rerankScoreMap,
      ltrScoreMap,
    });

    timing.totalMs = performance.now() - startTime;

    logger.info(
      {
        query: request.query.slice(0, 50),
        mode,
        resultCount: rankedDocuments.length,
        timing,
        reranked: rerankedResults !== null,
        ltr: ltrResults !== null,
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
        rerankModel,
        ltrModelVersion,
      },
    };
  }

  private buildRankedDocuments(options: {
    topDocIds: string[];
    documents: Map<string, GenericDocument>;
    fusedResults: WeightedRRFOutput[];
    rerankScoreMap: Map<string, number> | null;
    ltrScoreMap: Map<
      string,
      { score: number; rank: number; features: Record<string, number> }
    > | null;
  }): RankedDocument[] {
    const { topDocIds, documents, fusedResults, rerankScoreMap, ltrScoreMap } =
      options;
    return topDocIds.flatMap((docId, index) => {
      const doc = documents.get(docId);
      const fusedResult = fusedResults.find((r) => r.docId === docId);
      if (!(doc && fusedResult)) {
        return [];
      }

      const rerankScore = rerankScoreMap?.get(docId);
      const ltrData = ltrScoreMap?.get(docId);

      let finalScore: number;
      if (ltrData) {
        finalScore = ltrData.score;
      } else if (rerankScore !== undefined) {
        finalScore = rerankScore;
      } else {
        finalScore = fusedResult.score;
      }

      return [
        {
          document: doc,
          score: finalScore,
          bm25Rank: fusedResult.ranks.bm25 ?? undefined,
          denseRank: fusedResult.ranks.dense ?? undefined,
          sparseRank: fusedResult.ranks.sparse ?? undefined,
          rrfScore: fusedResult.score,
          rerankScore,
          rerankRank: rerankScore !== undefined ? index + 1 : undefined,
          ltrScore: ltrData?.score,
          ltrRank: ltrData?.rank,
          ltrFeatures: ltrData?.features,
        },
      ];
    });
  }

  private prepareForReranking(
    fusedResults: WeightedRRFOutput[],
    documents: Map<string, GenericDocument>
  ): RerankDocument[] {
    return fusedResults.flatMap((result, index) => {
      const doc = documents.get(result.docId);
      if (!doc) {
        return [];
      }

      return [
        {
          id: result.docId,
          content: doc.content?.slice(0, 2000) ?? "",
          title: doc.title,
          score: result.score,
          rank: index + 1,
        },
      ];
    });
  }

  private applyRerankScores(
    fusedResults: WeightedRRFOutput[],
    rerankResponse: RerankResponse
  ): Array<WeightedRRFOutput & { rerankScore: number }> {
    const scoreMap = new Map(
      rerankResponse.results.map((r) => [r.id, r.score])
    );

    const results = fusedResults.map((result) => ({
      ...result,
      rerankScore: scoreMap.get(result.docId) ?? 0,
    }));

    return results.sort((a, b) => {
      const aHasRerank = scoreMap.has(a.docId);
      const bHasRerank = scoreMap.has(b.docId);

      if (aHasRerank && bHasRerank) {
        return b.rerankScore - a.rerankScore;
      }
      if (aHasRerank) {
        return -1;
      }
      if (bHasRerank) {
        return 1;
      }
      return b.score - a.score;
    });
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
