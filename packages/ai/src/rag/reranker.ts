/**
 * Reranker
 *
 * Reranks retrieved documents for improved relevance.
 * Uses cross-encoder models or LLM-based reranking.
 */

import { completionService } from "../completion";
import type {
  RerankedDocument,
  RerankOptions,
  RetrievedDocument,
} from "./types";

/**
 * LLM-based reranking prompt
 */
const RERANK_PROMPT = `You are a document relevance ranker. Given a query and a list of documents, score each document's relevance to the query on a scale of 0-10.

Query: {query}

Documents:
{documents}

For each document, provide a relevance score (0-10) where:
- 0-2: Not relevant
- 3-4: Slightly relevant
- 5-6: Moderately relevant
- 7-8: Highly relevant
- 9-10: Perfect match

Respond in JSON format:
{
  "scores": [
    {"doc_id": "1", "score": 8, "reason": "Brief explanation"},
    ...
  ]
}`;

/**
 * Reranker class
 */
export class Reranker {
  /**
   * Rerank documents using LLM
   */
  async rerank(options: RerankOptions): Promise<RerankedDocument[]> {
    const { query, documents, topK } = options;

    if (documents.length === 0) {
      return [];
    }

    // If fewer documents than topK, just return sorted by original score
    if (documents.length <= topK) {
      return documents.map((doc, index) => ({
        ...doc,
        rerankScore: doc.relevanceScore,
        originalRank: index,
      }));
    }

    // Format documents for prompt
    const docsText = documents
      .slice(0, 20) // Limit to 20 docs for reranking
      .map(
        (doc, i) =>
          `[Document ${i + 1}]\nTitle: ${doc.title}\nContent: ${doc.content.slice(0, 500)}${doc.content.length > 500 ? "..." : ""}`
      )
      .join("\n\n");

    const prompt = RERANK_PROMPT.replace("{query}", query).replace(
      "{documents}",
      docsText
    );

    try {
      const result = await completionService.complete(
        [{ role: "user", content: prompt }],
        {
          temperature: 0,
          maxTokens: 1000,
        }
      );

      // Parse LLM response
      const scores = this.parseScores(result.content, documents);

      // Sort by rerank score and take top K
      return scores
        .sort((a, b) => b.rerankScore - a.rerankScore)
        .slice(0, topK);
    } catch (error) {
      // Fallback to original ranking on error
      console.error("Reranking failed, using original ranking:", error);
      return documents.slice(0, topK).map((doc, index) => ({
        ...doc,
        rerankScore: doc.relevanceScore,
        originalRank: index,
      }));
    }
  }

  /**
   * Fast rerank using semantic similarity
   * Uses the query embedding and document embeddings for quick reranking
   */
  async fastRerank(
    query: string,
    documents: RetrievedDocument[],
    queryEmbedding: number[],
    topK: number
  ): Promise<RerankedDocument[]> {
    // If documents have embeddings, use cosine similarity
    const docsWithEmbeddings = documents.filter((d) => d.embedding);

    if (docsWithEmbeddings.length === 0) {
      // No embeddings, return original order
      return documents.slice(0, topK).map((doc, index) => ({
        ...doc,
        rerankScore: doc.relevanceScore,
        originalRank: index,
      }));
    }

    // Calculate similarity scores
    const scored = documents.map((doc, index) => {
      let rerankScore = doc.relevanceScore;

      if (doc.embedding) {
        rerankScore = this.cosineSimilarity(queryEmbedding, doc.embedding);
      }

      return {
        ...doc,
        rerankScore,
        originalRank: index,
      };
    });

    return scored.sort((a, b) => b.rerankScore - a.rerankScore).slice(0, topK);
  }

  /**
   * Parse scores from LLM response
   */
  private parseScores(
    response: string,
    documents: RetrievedDocument[]
  ): RerankedDocument[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        scores: Array<{ doc_id: string; score: number; reason?: string }>;
      };

      if (!(parsed.scores && Array.isArray(parsed.scores))) {
        throw new Error("Invalid scores format");
      }

      // Map scores to documents
      const scoreMap = new Map<number, number>();
      for (const s of parsed.scores) {
        const docIndex = Number.parseInt(s.doc_id, 10) - 1;
        if (docIndex >= 0 && docIndex < documents.length) {
          scoreMap.set(docIndex, s.score / 10); // Normalize to 0-1
        }
      }

      return documents.map((doc, index) => ({
        ...doc,
        rerankScore: scoreMap.get(index) ?? doc.relevanceScore,
        originalRank: index,
      }));
    } catch {
      // Fallback on parse error
      return documents.map((doc, index) => ({
        ...doc,
        rerankScore: doc.relevanceScore,
        originalRank: index,
      }));
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

/**
 * Default reranker instance
 */
export const reranker = new Reranker();

/**
 * Convenience function
 */
export async function rerankDocuments(
  options: RerankOptions
): Promise<RerankedDocument[]> {
  return reranker.rerank(options);
}

export default reranker;
