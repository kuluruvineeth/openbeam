import type { LucidClient } from "../client";

export type LucidPage = {
  id: string;
  title: string;
  index: number;
  documentId: string;
};

export async function listDocumentPages(
  client: LucidClient,
  documentId: string
): Promise<LucidPage[]> {
  const response = await client.get<{ data: LucidPage[] }>(
    `/documents/${documentId}/pages`
  );
  return response.data ?? [];
}
