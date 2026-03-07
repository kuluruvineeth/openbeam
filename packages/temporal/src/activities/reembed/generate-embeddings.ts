import type { BGEM3EmbeddingResult, BGEM3Provider } from "@openbeam/ai";
import { getBGEM3Provider } from "@openbeam/ai";
import type {
  DocumentEmbedding,
  GenerateEmbeddingsInput,
  GenerateEmbeddingsOutput,
} from "./types";

const EMBED_CHUNK_SIZE = 20;
const EMBED_CONCURRENCY = 3;

async function embedInChunksParallel(
  bge: BGEM3Provider,
  texts: string[],
  mode: "query" | "document"
): Promise<BGEM3EmbeddingResult[]> {
  if (texts.length === 0) {
    return [];
  }

  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_CHUNK_SIZE) {
    chunks.push(texts.slice(i, i + EMBED_CHUNK_SIZE));
  }

  const results: BGEM3EmbeddingResult[] = [];

  for (let i = 0; i < chunks.length; i += EMBED_CONCURRENCY) {
    const batch = chunks.slice(i, i + EMBED_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((chunk) => bge.embedBatch(chunk, mode))
    );
    results.push(...batchResults.flat());
  }

  return results;
}

export async function generateEmbeddings(
  input: GenerateEmbeddingsInput
): Promise<GenerateEmbeddingsOutput> {
  const { documents } = input;

  if (documents.length === 0) {
    return { embeddings: [] };
  }

  const bge = getBGEM3Provider();

  const contents = documents.map((d) => d.content);
  const contentEmbeddings = await embedInChunksParallel(
    bge,
    contents,
    "document"
  );

  const docsWithTitles = documents
    .map((d, i) => ({ doc: d, idx: i }))
    .filter(({ doc }) => doc.title?.trim());

  let titleEmbeddings: BGEM3EmbeddingResult[] = [];
  if (docsWithTitles.length > 0) {
    const titles = docsWithTitles.map(({ doc }) => doc.title ?? "");
    titleEmbeddings = await embedInChunksParallel(bge, titles, "query");
  }

  const titleMap = new Map<number, BGEM3EmbeddingResult>();
  for (let i = 0; i < docsWithTitles.length; i++) {
    const item = docsWithTitles[i];
    const embedding = titleEmbeddings[i];
    if (item && embedding) {
      titleMap.set(item.idx, embedding);
    }
  }

  const embeddings: DocumentEmbedding[] = [];

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    const contentEmbedding = contentEmbeddings[i];

    if (!(doc && contentEmbedding?.dense)) {
      continue;
    }

    const titleEmbed = titleMap.get(i);

    embeddings.push({
      docId: doc.id,
      contentDense: contentEmbedding.dense,
      contentSparse: contentEmbedding.sparse ?? undefined,
      titleDense: titleEmbed?.dense,
    });
  }

  return { embeddings };
}
