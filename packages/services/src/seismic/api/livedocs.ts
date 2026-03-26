import type { SeismicClient } from "../client";

export type SeismicLiveDoc = {
  id: string;
  name: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  format?: string;
  url?: string;
  createdAt: string;
  modifiedAt: string;
  createdBy?: string;
  modifiedBy?: string;
  tags?: string[];
};

export function listAllLiveDocs(
  client: SeismicClient,
  params?: Record<string, string>
): AsyncGenerator<SeismicLiveDoc[], void, undefined> {
  return client.listAll<SeismicLiveDoc>("/livedocs", params);
}

export function getLiveDoc(
  client: SeismicClient,
  liveDocId: string
): Promise<SeismicLiveDoc> {
  return client.get<SeismicLiveDoc>(`/livedocs/${liveDocId}`);
}
