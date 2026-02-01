export interface CountDocumentsNeedingEmbeddingInput {
  teamId?: string;
}

export interface CountDocumentsNeedingEmbeddingOutput {
  count: number;
}

export interface FetchDocumentsForReembedInput {
  teamId?: string;
  limit: number;
}

export interface DocumentToReembed {
  id: string;
  content: string;
  title?: string;
}

export interface FetchDocumentsForReembedOutput {
  documents: DocumentToReembed[];
  validDocs: DocumentToReembed[];
  emptyDocs: DocumentToReembed[];
}

export interface GenerateEmbeddingsInput {
  documents: DocumentToReembed[];
}

export interface DocumentEmbedding {
  docId: string;
  contentDense: number[];
  contentSparse?: Record<string, number>;
  titleDense?: number[];
}

export interface GenerateEmbeddingsOutput {
  embeddings: DocumentEmbedding[];
}

export interface UpdateDocumentEmbeddingsInput {
  embeddings: DocumentEmbedding[];
}

export interface UpdateDocumentEmbeddingsOutput {
  processed: number;
  failed: number;
}

export interface MarkEmptyDocumentsInput {
  documentIds: string[];
}

export interface MarkEmptyDocumentsOutput {
  marked: number;
}

export interface ReembedActivities {
  countDocumentsNeedingEmbedding(
    input: CountDocumentsNeedingEmbeddingInput
  ): Promise<CountDocumentsNeedingEmbeddingOutput>;

  fetchDocumentsForReembed(
    input: FetchDocumentsForReembedInput
  ): Promise<FetchDocumentsForReembedOutput>;

  generateEmbeddings(
    input: GenerateEmbeddingsInput
  ): Promise<GenerateEmbeddingsOutput>;

  updateDocumentEmbeddings(
    input: UpdateDocumentEmbeddingsInput
  ): Promise<UpdateDocumentEmbeddingsOutput>;

  markEmptyDocuments(
    input: MarkEmptyDocumentsInput
  ): Promise<MarkEmptyDocumentsOutput>;
}
