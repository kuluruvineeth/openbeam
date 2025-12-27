import {
  EMBEDDING_TOKEN_LIMIT,
  type Embedding,
  embedQuery,
  getConfig as getAIConfig,
  getBGEM3Provider,
  prepareTextForEmbedding,
} from "@openplane/ai";
import { getOrGenerateEmbedding } from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import logger from "./logger";

const tracer = trace.getTracer("openplane-worker");

const MAX_TITLE_TOKENS = 256;
const CONTENT_TOKEN_LIMIT = EMBEDDING_TOKEN_LIMIT - 100;
const RETRY_TOKEN_LIMIT = 4000;

type EmbeddingProvider = "openai" | "bge-m3" | "dual";

export interface DocumentWithEmbeddings extends GenericDocument {
  content_embedding?: Embedding;
  title_embedding?: Embedding;
  embedding?: Embedding;
  title_embedding_v2?: Embedding;
  sparse_embedding?: Record<string, number>;
  embedding_version?: number;
}

function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER?.toLowerCase();
  if (provider === "bge-m3" || provider === "dual") {
    return provider;
  }
  return "openai";
}

function generateEmbeddingsForDoc(
  doc: GenericDocument,
  provider: EmbeddingProvider
): Promise<DocumentWithEmbeddings> {
  if (provider === "bge-m3") {
    return generateBGEM3Embeddings(doc);
  }
  if (provider === "dual") {
    return generateDualEmbeddings(doc);
  }
  return generateOpenAIEmbeddings(doc);
}

export async function generateEmbeddingsForDocuments(
  documents: GenericDocument[],
  connectorId: string
): Promise<DocumentWithEmbeddings[]> {
  const span = tracer.startSpan("embeddings.generate-batch", {
    attributes: {
      "connector.id": connectorId,
      "documents.count": documents.length,
    },
  });

  const startTime = Date.now();
  const provider = getEmbeddingProvider();

  try {
    const results: DocumentWithEmbeddings[] = [];
    let embeddedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        const docWithEmbeddings = await generateEmbeddingsForDoc(doc, provider);

        results.push(docWithEmbeddings);

        if (
          docWithEmbeddings.content_embedding ||
          docWithEmbeddings.embedding
        ) {
          embeddedCount += 1;
        } else {
          skippedCount += 1;
        }
      } catch (error) {
        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
            docId: doc.id,
            connectorId,
          },
          "Failed to generate embeddings for document, continuing without embeddings"
        );
        results.push(doc);
        errorCount += 1;
      }
    }

    const durationMs = Date.now() - startTime;

    logger.info(
      {
        connectorId,
        total: documents.length,
        embedded: embeddedCount,
        skipped: skippedCount,
        errors: errorCount,
        provider,
        durationMs,
      },
      "Generated embeddings for document batch"
    );

    span.setAttributes({
      "embeddings.embedded": embeddedCount,
      "embeddings.skipped": skippedCount,
      "embeddings.errors": errorCount,
      "embeddings.provider": provider,
      "embeddings.duration_ms": durationMs,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return results;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: retry logic for token limits requires branching
async function generateOpenAIEmbeddings(
  doc: GenericDocument
): Promise<DocumentWithEmbeddings> {
  const aiConfig = getAIConfig();
  const modelId = aiConfig.defaultEmbeddingModel;
  const result: DocumentWithEmbeddings = { ...doc };

  if (doc.content && doc.content.length > 0) {
    const contentToEmbed = prepareTextForEmbedding(
      doc.content,
      CONTENT_TOKEN_LIMIT
    );
    if (contentToEmbed) {
      try {
        result.content_embedding = await getOrGenerateEmbedding(
          contentToEmbed,
          modelId,
          () => embedQuery(contentToEmbed)
        );
      } catch (error) {
        if (isTokenLimitError(error)) {
          logger.info(
            { docId: doc.id, originalLength: doc.content.length },
            "Token limit hit, retrying with further truncation"
          );
          const shorterContent = prepareTextForEmbedding(
            doc.content,
            RETRY_TOKEN_LIMIT
          );
          if (shorterContent) {
            result.content_embedding = await getOrGenerateEmbedding(
              shorterContent,
              modelId,
              () => embedQuery(shorterContent)
            );
          }
        } else {
          throw error;
        }
      }
    }
  }

  if (doc.title && doc.title.length > 0) {
    const titleToEmbed = prepareTextForEmbedding(doc.title, MAX_TITLE_TOKENS);
    if (titleToEmbed) {
      result.title_embedding = await getOrGenerateEmbedding(
        titleToEmbed,
        modelId,
        () => embedQuery(titleToEmbed)
      );
    }
  }

  return result;
}

async function generateBGEM3Embeddings(
  doc: GenericDocument
): Promise<DocumentWithEmbeddings> {
  const bge = getBGEM3Provider();
  const result: DocumentWithEmbeddings = { ...doc, embedding_version: 2 };

  if (doc.content && doc.content.length > 0) {
    const contentEmbedding = await bge.embedDocument(doc.content);
    result.embedding = contentEmbedding.dense;
    result.sparse_embedding = contentEmbedding.sparse ?? undefined;
  }

  if (doc.title && doc.title.length > 0) {
    const titleEmbedding = await bge.embedQuery(doc.title);
    result.title_embedding_v2 = titleEmbedding.dense;
  }

  return result;
}

async function generateDualEmbeddings(
  doc: GenericDocument
): Promise<DocumentWithEmbeddings> {
  const [openaiResult, bgeResult] = await Promise.all([
    generateOpenAIEmbeddings(doc),
    generateBGEM3Embeddings(doc),
  ]);

  return {
    ...doc,
    content_embedding: openaiResult.content_embedding,
    title_embedding: openaiResult.title_embedding,
    embedding: bgeResult.embedding,
    title_embedding_v2: bgeResult.title_embedding_v2,
    sparse_embedding: bgeResult.sparse_embedding,
    embedding_version: 2,
  };
}

function isTokenLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    msg.includes("maximum context length") ||
    msg.includes("token") ||
    msg.includes("too long")
  );
}

export function isEmbeddingEnabled(): boolean {
  const provider = getEmbeddingProvider();

  if (provider === "bge-m3") {
    return !!process.env.ENGINE_URL;
  }

  if (provider === "dual") {
    const config = getAIConfig();
    return !!config.providers.openai.apiKey && !!process.env.ENGINE_URL;
  }

  try {
    const config = getAIConfig();
    return !!config.providers.openai.apiKey;
  } catch {
    return false;
  }
}
