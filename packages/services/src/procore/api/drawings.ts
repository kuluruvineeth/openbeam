import type { ProcoreClient } from "../client";

export type ProcoreDrawing = {
  id: number;
  number: string;
  title: string | null;
  discipline: string | null;
  set: { id: number; name: string } | null;
  revision_number: number;
  current: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
  received_date: string | null;
  drawing_date: string | null;
  project: { id: number; name: string } | null;
};

export function listProjectDrawings(
  client: ProcoreClient,
  projectId: number,
  params?: Record<string, string>
): AsyncGenerator<ProcoreDrawing[], void, undefined> {
  return client.listAll<ProcoreDrawing>(
    `/projects/${projectId}/drawings`,
    params
  );
}
