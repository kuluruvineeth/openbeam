import type { LucidClient } from "../client";

export type LucidDocument = {
  id: string;
  title: string;
  product: string;
  creatorId: string;
  creatorName: string;
  lastEditorId: string;
  lastEditorName: string;
  status: string;
  createdDate: string;
  lastModifiedDate: string;
  parentFolderId: string | null;
  editUrl: string;
  viewUrl: string;
  pageCount: number;
};

export function listAllDocuments(
  client: LucidClient,
  params?: Record<string, string>
): AsyncGenerator<LucidDocument[], void, undefined> {
  return client.listAll<LucidDocument>("/documents", params);
}

export function getDocument(
  client: LucidClient,
  documentId: string
): Promise<LucidDocument> {
  return client.get<LucidDocument>(`/documents/${documentId}`);
}
