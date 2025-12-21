import {
  EMBEDDING_TOKEN_LIMIT,
  type Embedding,
  embedQuery,
  getConfig as getAIConfig,
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

export interface DocumentWithEmbeddings extends GenericDocument {
  content_embedding?: Embedding;
  title_embedding?: Embedding;
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
  const aiConfig = getAIConfig();
  const modelId = aiConfig.defaultEmbeddingModel;

  try {
    const results: DocumentWithEmbeddings[] = [];
    let embeddedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of documents) {
      try {
        const docWithEmbeddings = await generateEmbeddingsForDocument(
          doc,
          modelId
        );
        results.push(docWithEmbeddings);

        if (docWithEmbeddings.content_embedding) {
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
        durationMs,
      },
      "Generated embeddings for document batch"
    );

    span.setAttributes({
      "embeddings.embedded": embeddedCount,
      "embeddings.skipped": skippedCount,
      "embeddings.errors": errorCount,
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
async function generateEmbeddingsForDocument(
  doc: GenericDocument,
  modelId: string
): Promise<DocumentWithEmbeddings> {
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
  try {
    const config = getAIConfig();
    return !!config.providers.openai.apiKey;
  } catch {
    return false;
  }
}
