import {
  type Embedding,
  embedQuery,
  getConfig as getAIConfig,
} from "@openplane/ai";
import { getOrGenerateEmbedding } from "@openplane/services";
import type { GenericDocument } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import logger from "./logger";

const tracer = trace.getTracer("openplane-worker");

const MAX_CONTENT_LENGTH = 32_000;
const MAX_TITLE_LENGTH = 512;

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

async function generateEmbeddingsForDocument(
  doc: GenericDocument,
  modelId: string
): Promise<DocumentWithEmbeddings> {
  const result: DocumentWithEmbeddings = { ...doc };

  if (doc.content && doc.content.length > 0) {
    const contentToEmbed = prepareContentForEmbedding(doc.content);
    if (contentToEmbed) {
      result.content_embedding = await getOrGenerateEmbedding(
        contentToEmbed,
        modelId,
        () => embedQuery(contentToEmbed)
      );
    }
  }

  if (doc.title && doc.title.length > 0) {
    const titleToEmbed = doc.title.slice(0, MAX_TITLE_LENGTH);
    result.title_embedding = await getOrGenerateEmbedding(
      titleToEmbed,
      modelId,
      () => embedQuery(titleToEmbed)
    );
  }

  return result;
}

function prepareContentForEmbedding(content: string): string | null {
  if (!content || content.trim().length === 0) {
    return null;
  }

  let cleaned = content.replace(/\s+/g, " ").replace(/\0/g, "").trim();

  if (cleaned.length > MAX_CONTENT_LENGTH) {
    cleaned = cleaned.slice(0, MAX_CONTENT_LENGTH);
    const lastPeriod = cleaned.lastIndexOf(". ");
    if (lastPeriod > MAX_CONTENT_LENGTH * 0.8) {
      cleaned = cleaned.slice(0, lastPeriod + 1);
    }
  }

  if (cleaned.length < 10) {
    return null;
  }

  return cleaned;
}

export function isEmbeddingEnabled(): boolean {
  try {
    const config = getAIConfig();
    return !!config.providers.openai.apiKey;
  } catch {
    return false;
  }
}
