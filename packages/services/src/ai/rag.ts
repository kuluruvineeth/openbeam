import {
  type ChatMessage,
  type CompletionContext,
  completeWithContext,
  estimateTokens,
  type StreamChunk,
  streamCompletion,
} from "@openplane/ai";
import { hybridSearch } from "./hybrid-search";
import type {
  Citation,
  ContextDocument,
  RAGAnswer,
  RAGAnswerParams,
  RAGContext,
  RAGContextParams,
} from "./types";

const DEFAULT_CONFIG = {
  maxTokens: 16_000,
  topK: 10,
  minScore: 0.2,
};

const DEFAULT_RAG_PROMPT = `You are a helpful AI assistant that answers questions based on the provided context from your organization's knowledge base.

Instructions:
- Answer the user's question based primarily on the provided context documents
- If the context doesn't contain enough information to fully answer, say so clearly
- Cite your sources by referencing document titles when making specific claims
- Be concise but comprehensive in your response
- If you're unsure about something, acknowledge the uncertainty
- Format your response using markdown for better readability
- Do not make up information that isn't in the context`;

// biome-ignore lint/complexity: RAG context building has inherent complexity for token management
export async function buildRAGContext(
  params: RAGContextParams
): Promise<RAGContext> {
  const startTime = Date.now();

  const {
    query,
    teamId,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topK = DEFAULT_CONFIG.topK,
    minScore = DEFAULT_CONFIG.minScore,
    accessControlIds,
    includeMetadata = false,
  } = params;

  const searchResult = await hybridSearch({
    query,
    teamId,
    limit: topK * 2,
    minScore,
    accessControlIds,
  });

  const documents: ContextDocument[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const doc of searchResult.documents) {
    let content = doc.content || "";

    if (includeMetadata) {
      const meta: string[] = [];
      if (doc.connector_type) {
        meta.push(`Source: ${doc.connector_type}`);
      }
      if (doc.source_name) {
        meta.push(`Channel/Folder: ${doc.source_name}`);
      }
      if (doc.author_name) {
        meta.push(`Author: ${doc.author_name}`);
      }
      if (doc.created_at) {
        const date = new Date(doc.created_at).toLocaleDateString();
        meta.push(`Date: ${date}`);
      }
      if (meta.length > 0) {
        content = `[${meta.join(" | ")}]\n${content}`;
      }
    }

    const tokenCount =
      estimateTokens(content) + estimateTokens(doc.title || "");

    if (totalTokens + tokenCount > maxTokens) {
      const remainingTokens = maxTokens - totalTokens;
      if (remainingTokens > 100) {
        const truncatedContent = content.slice(0, remainingTokens * 4);
        documents.push({
          id: doc.id,
          title: doc.title || "Untitled",
          content: `${truncatedContent}...`,
          url: doc.url,
          source: doc.source_name,
          connectorType: doc.connector_type,
          relevanceScore: doc.relevanceScore,
          tokenCount: estimateTokens(truncatedContent),
        });
        totalTokens += estimateTokens(truncatedContent);
      }
      truncated = true;
      break;
    }

    documents.push({
      id: doc.id,
      title: doc.title || "Untitled",
      content,
      url: doc.url,
      source: doc.source_name,
      connectorType: doc.connector_type,
      relevanceScore: doc.relevanceScore,
      tokenCount,
    });

    totalTokens += tokenCount;

    if (documents.length >= topK) {
      break;
    }
  }

  return {
    documents,
    totalTokens,
    truncated,
    retrievalTime: Date.now() - startTime,
  };
}

export async function ragAnswer(params: RAGAnswerParams): Promise<RAGAnswer> {
  const startTime = Date.now();

  const context = await buildRAGContext(params);

  if (context.documents.length === 0) {
    return {
      answer:
        "I couldn't find any relevant documents to answer your question. Please try rephrasing your query or check if the relevant data has been synced.",
      citations: [],
      context,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      latencyMs: Date.now() - startTime,
    };
  }

  const aiContext: CompletionContext = {
    documents: context.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      url: doc.url,
      source: doc.source,
      relevanceScore: doc.relevanceScore,
    })),
    query: params.query,
  };

  const result = await completeWithContext(params.query, aiContext, {
    systemPrompt: params.systemPrompt || DEFAULT_RAG_PROMPT,
    modelId: params.modelId,
    temperature: params.temperature ?? 0.3,
  });

  const citations: Citation[] = result.citations.map((c) => ({
    documentId: c.documentId,
    title: c.title,
    url: c.url,
    snippet: c.snippet,
    relevanceScore: c.relevanceScore || 0,
  }));

  return {
    answer: result.content,
    citations,
    context,
    usage: {
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      totalTokens: result.usage.inputTokens + result.usage.outputTokens,
    },
    latencyMs: Date.now() - startTime,
  };
}

export async function* ragStream(
  params: RAGAnswerParams
): AsyncGenerator<StreamChunk | { type: "context"; context: RAGContext }> {
  const context = await buildRAGContext(params);

  yield { type: "context", context };

  if (context.documents.length === 0) {
    yield {
      type: "text",
      content:
        "I couldn't find any relevant documents to answer your question. Please try rephrasing your query or check if the relevant data has been synced.",
    };
    yield { type: "done", content: "", usage: {} };
    return;
  }

  const contextPrompt = context.documents
    .map((doc, i) => `[Document ${i + 1}: ${doc.title}]\n${doc.content}`)
    .join("\n\n---\n\n");

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `Context Documents:\n${contextPrompt}\n\nQuestion: ${params.query}`,
    },
  ];

  for await (const chunk of streamCompletion(messages, {
    systemPrompt: params.systemPrompt || DEFAULT_RAG_PROMPT,
    modelId: params.modelId,
    temperature: params.temperature ?? 0.3,
  })) {
    yield chunk;
  }
}

export async function askQuestion(
  question: string,
  teamId: string,
  options: {
    accessControlIds?: string[];
    topK?: number;
    modelId?: string;
  } = {}
): Promise<{
  answer: string;
  sources: Array<{ title: string; url?: string }>;
}> {
  const result = await ragAnswer({
    query: question,
    teamId,
    accessControlIds: options.accessControlIds,
    topK: options.topK,
    modelId: options.modelId,
  });

  return {
    answer: result.answer,
    sources: result.citations.map((c) => ({
      title: c.title,
      url: c.url,
    })),
  };
}
