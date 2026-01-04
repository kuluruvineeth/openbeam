import {
  type ChatMessage,
  type CompletionContext,
  completeWithContext,
  estimateTokens,
  type StreamChunk,
  streamCompletion,
} from "@openplane/ai";
import { searchService } from "../search/service";
import type { ScoredMedia, SearchScoredDocument } from "../search/types";
import type {
  AnswerCitation,
  RAGAnswer,
  RAGAnswerParams,
  RAGContext,
  RAGContextDocument,
  RAGContextParams,
} from "./types";

const DEFAULT_CONFIG = {
  maxTokens: 16_000,
  topK: 10,
  minScore: 0.2,
};

const DEFAULT_RAG_PROMPT = `Answer questions using the provided context. Your response MUST be under 2500 characters.

Format using Slack mrkdwn (NOT standard markdown):
- Use *bold* (single asterisk) not **bold**
- Use _italic_ (underscores)
- Use flat bullet points with • or -
- Use \`code\` for inline code
- Never use **bold** or [links](url) markdown syntax

Rules:
- Answer ONLY from the provided context documents
- If context is insufficient, say "I couldn't find enough information to answer this"
- Be extremely concise - prefer short paragraphs and bullet points
- Maximum 5 bullet points per list
- One sentence per bullet, no sub-bullets
- Cite sources by mentioning document titles inline
- Never make up information not in the context
- Never include lengthy explanations or caveats
- Get straight to the answer`;

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: RAG context building requires handling both documents and media with token management
export async function buildRAGContext(
  params: RAGContextParams
): Promise<RAGContext> {
  const startTime = Date.now();

  const {
    query,
    teamId,
    maxTokens = DEFAULT_CONFIG.maxTokens,
    topK = DEFAULT_CONFIG.topK,
    accessControlIds,
    includeMetadata = false,
    sourceId,
    includeMedia = true,
  } = params;

  const searchResult = await searchService.searchUnified({
    query,
    teamId,
    limit: topK * 2,
    accessControlIds,
    includeDocuments: true,
    includeMedia,
    sourceId,
  });

  const documents: RAGContextDocument[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const item of searchResult.items) {
    const { content, title, url, source, connectorType, sourceType } =
      item.type === "media"
        ? extractMediaContent(item.data, includeMetadata)
        : extractDocumentContent(item.data, includeMetadata);

    const tokenCount = estimateTokens(content) + estimateTokens(title);

    if (totalTokens + tokenCount > maxTokens) {
      const remainingTokens = maxTokens - totalTokens;
      if (remainingTokens > 100) {
        const truncatedContent = content.slice(0, remainingTokens * 4);
        documents.push({
          id: item.type === "media" ? item.data.id : item.data.id,
          title,
          content: `${truncatedContent}...`,
          url,
          source,
          connectorType,
          sourceType,
          relevanceScore: item.relevance,
          tokenCount: estimateTokens(truncatedContent),
        });
        totalTokens += estimateTokens(truncatedContent);
      }
      truncated = true;
      break;
    }

    documents.push({
      id: item.type === "media" ? item.data.id : item.data.id,
      title,
      content,
      url,
      source,
      connectorType,
      sourceType,
      relevanceScore: item.relevance,
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

interface ExtractedContent {
  content: string;
  title: string;
  url?: string;
  source?: string;
  connectorType?: string;
  sourceType: "document" | "media";
}

function buildDocumentMetadata(doc: SearchScoredDocument): string[] {
  const meta: string[] = [];
  if (doc.connector_type) {
    meta.push(`Source: ${doc.connector_type}`);
  }
  if (doc.source_name) {
    meta.push(`Channel: ${doc.source_name}`);
  }
  if (doc.author_name) {
    meta.push(`Author: ${doc.author_name}`);
  }
  if (doc.author_email) {
    meta.push(`Email: ${doc.author_email}`);
  }
  if (doc.document_type) {
    meta.push(`Type: ${doc.document_type}`);
  }
  if (doc.created_at) {
    meta.push(`Date: ${new Date(doc.created_at).toLocaleDateString()}`);
  }
  return meta;
}

function extractDocumentContent(
  doc: SearchScoredDocument,
  includeMetadata: boolean
): ExtractedContent {
  let content = doc.content || "";

  if (includeMetadata) {
    const meta = buildDocumentMetadata(doc);
    if (meta.length > 0) {
      content = `[${meta.join(" | ")}]\n${content}`;
    }
  }

  return {
    content,
    title: doc.title || "Untitled",
    url: doc.url,
    source: doc.source_name,
    connectorType: doc.connector_type,
    sourceType: "document",
  };
}

function extractMediaContent(
  media: ScoredMedia,
  includeMetadata: boolean
): ExtractedContent {
  let content = media.transcript || media.media_summary || "";

  if (includeMetadata) {
    const meta: string[] = ["Source: Video/Media"];
    if (media.source_name) {
      meta.push(`Channel: ${media.source_name}`);
    }
    if (media.author_name) {
      meta.push(`Author: ${media.author_name}`);
    }
    if (media.duration_seconds) {
      const mins = Math.floor(media.duration_seconds / 60);
      meta.push(`Duration: ${mins}m`);
    }
    if (meta.length > 0) {
      content = `[${meta.join(" | ")}]\n${content}`;
    }
  }

  const sourceUrl = (media.metadata?.sourceUrl as string) ?? media.url;

  return {
    content,
    title: media.title || "Untitled Media",
    url: sourceUrl,
    source: media.source_name,
    connectorType: media.connector_type,
    sourceType: "media",
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

  const documentMap = new Map(context.documents.map((d) => [d.id, d]));

  const citations: AnswerCitation[] = result.citations.map((c) => {
    const contextDoc = documentMap.get(c.documentId);
    return {
      documentId: c.documentId,
      title: c.title,
      url: c.url,
      snippet: c.snippet,
      relevanceScore: c.relevanceScore || 0,
      connectorType: contextDoc?.connectorType,
      sourceType: contextDoc?.sourceType,
    };
  });

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
