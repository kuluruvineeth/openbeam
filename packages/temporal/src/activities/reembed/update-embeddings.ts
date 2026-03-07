import { vespaClient } from "@openbeam/vespa";
import type {
  DocumentEmbedding,
  MarkEmptyDocumentsInput,
  MarkEmptyDocumentsOutput,
  UpdateDocumentEmbeddingsInput,
  UpdateDocumentEmbeddingsOutput,
} from "./types";

function formatDenseTensor(values: number[]): { values: number[] } {
  return { values };
}

function formatSparseTensor(sparse: Record<string, number>): {
  cells: Array<{ address: { token: string }; value: number }>;
} {
  const cells = Object.entries(sparse).map(([token, value]) => ({
    address: { token },
    value,
  }));
  return { cells };
}

function buildEmbeddingUpdate(
  embedding: DocumentEmbedding
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    embedding: formatDenseTensor(embedding.contentDense),
    embedding_version: 2,
  };

  if (embedding.contentSparse) {
    update.sparse_embedding = formatSparseTensor(embedding.contentSparse);
  }

  if (embedding.titleDense) {
    update.title_embedding_v2 = formatDenseTensor(embedding.titleDense);
  }

  return update;
}

export async function updateDocumentEmbeddings(
  input: UpdateDocumentEmbeddingsInput
): Promise<UpdateDocumentEmbeddingsOutput> {
  const { embeddings } = input;

  if (embeddings.length === 0) {
    return { processed: 0, failed: 0 };
  }

  const updates = embeddings.map((embedding) => ({
    id: embedding.docId,
    fields: buildEmbeddingUpdate(embedding),
  }));

  const result = await vespaClient.partialUpdateBatch(updates);

  return {
    processed: result.succeeded.length,
    failed: result.failed.length,
  };
}

export async function markEmptyDocuments(
  input: MarkEmptyDocumentsInput
): Promise<MarkEmptyDocumentsOutput> {
  const { documentIds } = input;

  if (documentIds.length === 0) {
    return { marked: 0 };
  }

  const updates = documentIds.map((id) => ({
    id,
    fields: { embedding_version: 2 },
  }));

  const result = await vespaClient.partialUpdateBatch(updates);

  return {
    marked: result.succeeded.length,
  };
}
