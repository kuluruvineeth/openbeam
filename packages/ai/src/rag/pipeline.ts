/**
 * RAG Pipeline
 *
 * Main orchestrator for Retrieval-Augmented Generation.
 * Combines embedding, retrieval, context building, and completion.
 */

import { completionService } from "../completion";
import type { Citation, ContextDocument } from "../completion/types";
import { getConfig } from "../config";
import { embeddingService } from "../embeddings";
import { contextBuilder } from "./context-builder";
import { reranker } from "./reranker";
import { retriever } from "./retriever";
import type {
  RAGAnswer,
  RAGOptions,
  RAGStreamChunk,
  RetrievedDocument,
} from "./types";

/**
 * Default system prompt for RAG
 */
const DEFAULT_RAG_SYSTEM_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context documents.

Guidelines:
1. Base your answers primarily on the context documents provided
2. If the context doesn't contain enough information to fully answer the question, acknowledge this
3. Cite your sources by mentioning document titles when making specific claims
4. Be concise but comprehensive
5. Use markdown formatting for better readability
6. If you're uncertain about something, express that uncertainty
7. Never make up information that isn't in the context`;

/**
 * RAG Pipeline class
 */
export class RAGPipeline {
  /**
   * Answer a question using RAG
   */
  async answer(
    query: string,
    teamId: string,
    options: RAGOptions = {}
  ): Promise<RAGAnswer> {
    const startTime = Date.now();

    // 1. Embed the query
    const embeddingStart = Date.now();
    const queryEmbedding = await embeddingService.embedQuery(query);
    const embeddingMs = Date.now() - embeddingStart;

    // 2. Retrieve documents
    const retrievalStart = Date.now();
    const retrievalResult = await retriever.retrieveWithEmbedding(
      query,
      queryEmbedding,
      teamId,
      {
        topK: options.retrieval?.topK || getConfig().rag.defaultTopK,
        minScore:
          options.retrieval?.minScore || getConfig().rag.minRelevanceScore,
        accessControl: options.accessControl,
        ...options.retrieval,
      }
    );
    const retrievalMs = Date.now() - retrievalStart;

    let documents = retrievalResult.documents;

    // 3. Rerank if enabled
    if (getConfig().rag.enableReranking && documents.length > 0) {
      const rerankedDocs = await reranker.fastRerank(
        query,
        documents,
        queryEmbedding,
        options.retrieval?.rerankTopK || getConfig().rag.rerankTopK
      );
      documents = rerankedDocs;
    }

    // 4. Build context
    const context = contextBuilder.build(documents);

    // 5. Generate answer
    const generationStart = Date.now();
    const contextDocs: ContextDocument[] = context.documents.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      url: d.url,
      source: d.connectorType,
      relevanceScore: d.relevanceScore,
    }));

    const result = await completionService.completeWithContext(
      query,
      {
        documents: contextDocs,
        maxTokens: options.maxContextTokens,
      },
      {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
        abortSignal: options.abortSignal,
      }
    );
    const generationMs = Date.now() - generationStart;

    return {
      answer: result.content,
      citations: result.citations,
      documents,
      usage: result.usage,
      timing: {
        embeddingMs,
        retrievalMs,
        generationMs,
        totalMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Stream an answer using RAG
   */
  async *stream(
    query: string,
    teamId: string,
    options: RAGOptions = {}
  ): AsyncIterable<RAGStreamChunk> {
    const startTime = Date.now();

    // 1. Embed the query
    const queryEmbedding = await embeddingService.embedQuery(query);

    // 2. Retrieve documents
    const retrievalResult = await retriever.retrieveWithEmbedding(
      query,
      queryEmbedding,
      teamId,
      {
        topK: options.retrieval?.topK || getConfig().rag.defaultTopK,
        minScore:
          options.retrieval?.minScore || getConfig().rag.minRelevanceScore,
        accessControl: options.accessControl,
        ...options.retrieval,
      }
    );

    let documents = retrievalResult.documents;

    // 3. Rerank if enabled
    if (getConfig().rag.enableReranking && documents.length > 0) {
      const rerankedDocs = await reranker.fastRerank(
        query,
        documents,
        queryEmbedding,
        options.retrieval?.rerankTopK || getConfig().rag.rerankTopK
      );
      documents = rerankedDocs;
    }

    // 4. Build context
    const context = contextBuilder.build(documents);

    // 5. Stream generation
    const contextDocs: ContextDocument[] = context.documents.map((d) => ({
      id: d.id,
      title: d.title,
      content: d.content,
      url: d.url,
      source: d.connectorType,
      relevanceScore: d.relevanceScore,
    }));

    // Yield documents first so UI can show sources
    yield {
      type: "text",
      content: "",
      documents,
    };

    // Stream the answer
    for await (const chunk of completionService.streamWithContext(
      query,
      { documents: contextDocs },
      {
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT,
        abortSignal: options.abortSignal,
      }
    )) {
      yield chunk as RAGStreamChunk;
    }

    // Yield citations at the end
    const citations: Citation[] = context.documents.map((d) => ({
      documentId: d.id,
      title: d.title,
      url: d.url,
      snippet: d.content.slice(0, 200),
      relevanceScore: d.relevanceScore,
    }));

    yield {
      type: "done",
      citations,
      documents,
    };
  }

  /**
   * Stream text only (simpler interface)
   */
  async *streamText(
    query: string,
    teamId: string,
    options: RAGOptions = {}
  ): AsyncIterable<string> {
    for await (const chunk of this.stream(query, teamId, options)) {
      if (chunk.type === "text" && chunk.content) {
        yield chunk.content;
      }
    }
  }

  /**
   * Summarize multiple documents
   */
  async summarize(
    documents: RetrievedDocument[],
    options: {
      query?: string;
      maxLength?: number;
      style?: "brief" | "detailed" | "bullets";
    } = {}
  ): Promise<string> {
    const { query, maxLength = 500, style = "brief" } = options;

    const context = contextBuilder.build(documents);

    const styleInstructions = {
      brief: "Provide a concise summary in 2-3 sentences.",
      detailed: "Provide a comprehensive summary covering all key points.",
      bullets: "Summarize the key points as a bulleted list.",
    };

    const prompt = query
      ? `Based on the following documents, answer this question: ${query}\n\nDocuments:\n${context.prompt}`
      : `Summarize the following documents:\n\n${context.prompt}`;

    const result = await completionService.complete(
      [{ role: "user", content: prompt }],
      {
        systemPrompt: `You are a helpful assistant that summarizes documents. ${styleInstructions[style]} Keep your response under ${maxLength} words.`,
        maxTokens: maxLength * 2,
      }
    );

    return result.content;
  }

  /**
   * Extract key points from documents
   */
  async extractKeyPoints(
    documents: RetrievedDocument[],
    options: { maxPoints?: number } = {}
  ): Promise<string[]> {
    const { maxPoints = 5 } = options;
    const context = contextBuilder.build(documents);

    const prompt = `Extract the ${maxPoints} most important key points from the following documents. Return only the key points as a JSON array of strings.\n\nDocuments:\n${context.prompt}`;

    const result = await completionService.complete(
      [{ role: "user", content: prompt }],
      {
        temperature: 0,
        maxTokens: 500,
      }
    );

    try {
      const match = result.content.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]) as string[];
      }
    } catch {
      // Parse failed, extract manually
    }

    // Fallback: split by newlines
    return result.content
      .split("\n")
      .filter((line) => line.trim())
      .slice(0, maxPoints);
  }
}

/**
 * Default RAG pipeline instance
 */
export const ragPipeline = new RAGPipeline();

/**
 * Convenience functions
 */
export async function ragAnswer(
  query: string,
  teamId: string,
  options?: RAGOptions
): Promise<RAGAnswer> {
  return ragPipeline.answer(query, teamId, options);
}

export async function* ragStream(
  query: string,
  teamId: string,
  options?: RAGOptions
): AsyncIterable<RAGStreamChunk> {
  yield* ragPipeline.stream(query, teamId, options);
}

export default ragPipeline;
