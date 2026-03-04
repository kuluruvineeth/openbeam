import type {
  EdgeDocumentRecord,
  EdgeDocumentStore,
  EdgeSearchQuery,
  EdgeSearchResponse,
  EdgeSearchResult,
  FTSProvider,
  VectorProvider,
} from "@openplane/types/edge/search";
import { hybridRank } from "../ranker/hybrid";

type EdgeSearchEngineConfig = {
  fts: FTSProvider;
  vector?: VectorProvider;
  store: EdgeDocumentStore;
  defaultAlpha?: number;
};

export class EdgeSearchEngine {
  private readonly fts: FTSProvider;
  private readonly vector: VectorProvider | undefined;
  private readonly store: EdgeDocumentStore;
  private readonly defaultAlpha: number;

  constructor(config: EdgeSearchEngineConfig) {
    this.fts = config.fts;
    this.vector = config.vector;
    this.store = config.store;
    this.defaultAlpha = config.defaultAlpha ?? 0.5;
  }

  async search(
    query: EdgeSearchQuery,
    embedding?: Float32Array
  ): Promise<EdgeSearchResponse> {
    const start = performance.now();
    const limit = query.limit ?? 10;
    const alpha = query.hybridAlpha ?? this.defaultAlpha;

    const useVector = this.vector !== undefined && embedding !== undefined;
    const searchMode = useVector ? "hybrid" : "fts_only";

    const ftsResults = await this.fts.search(query.query, limit);

    let finalResults: Array<{
      documentId: string;
      score: number;
      ftsScore?: number;
      vectorScore?: number;
    }>;

    if (useVector && this.vector && embedding) {
      const vectorResults = await this.vector.search(embedding, limit);
      finalResults = hybridRank(ftsResults, vectorResults, alpha);
    } else {
      finalResults = ftsResults.map((r) => ({
        ...r,
        ftsScore: r.score,
      }));
    }

    const paginatedResults = finalResults.slice(0, limit);

    const searchResults: EdgeSearchResult[] = [];
    for (const result of paginatedResults) {
      const doc = await this.store.get(result.documentId);
      if (!doc) {
        continue;
      }

      if (query.connectorIds && !query.connectorIds.includes(doc.connectorId)) {
        continue;
      }
      if (
        query.documentTypes &&
        doc.documentType &&
        !query.documentTypes.includes(doc.documentType)
      ) {
        continue;
      }

      searchResults.push({
        documentId: result.documentId,
        title: doc.title,
        snippet: doc.content.slice(0, 200),
        score: result.score,
        ftsScore: result.ftsScore,
        vectorScore: result.vectorScore,
        connectorId: doc.connectorId,
        documentType: doc.documentType,
        updatedAt: doc.updatedAt,
        metadata: doc.metadata,
      });
    }

    return {
      results: searchResults,
      totalHits: searchResults.length,
      queryTimeMs: performance.now() - start,
      searchMode,
    };
  }

  async indexDocument(doc: EdgeDocumentRecord): Promise<void> {
    await this.store.put(doc.documentId, doc);
    await this.fts.index(doc.documentId, doc.title, doc.content);
    if (this.vector && doc.embedding) {
      await this.vector.upsert(doc.documentId, doc.embedding);
    }
  }

  async removeDocument(documentId: string): Promise<void> {
    await this.store.delete(documentId);
    await this.fts.remove(documentId);
    if (this.vector) {
      await this.vector.remove(documentId);
    }
  }

  async stats(): Promise<{
    ftsDocuments: number;
    vectorDocuments: number;
    storeDocuments: number;
  }> {
    const [ftsDocuments, vectorDocuments, storeDocuments] = await Promise.all([
      this.fts.documentCount(),
      this.vector?.documentCount() ?? 0,
      this.store.count(),
    ]);
    return { ftsDocuments, vectorDocuments, storeDocuments };
  }
}
