import type { ProcoreClient } from "../client";

export type ProcoreDocument = {
  id: number;
  name: string;
  document_type: string | null;
  private: boolean;
  size: number | null;
  created_at: string;
  updated_at: string;
  created_by: { id: number; name: string } | null;
  parent: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
};

export function listProjectDocuments(
  client: ProcoreClient,
  projectId: number,
  params?: Record<string, string>
): AsyncGenerator<ProcoreDocument[], void, undefined> {
  return client.listAll<ProcoreDocument>(
    `/projects/${projectId}/documents`,
    params
  );
}
