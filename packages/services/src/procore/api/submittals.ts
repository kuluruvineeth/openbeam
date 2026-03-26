import type { ProcoreClient } from "../client";

export type ProcoreSubmittal = {
  id: number;
  number: number;
  revision: number;
  title: string;
  description: string | null;
  status: { id: number; name: string } | null;
  submittal_type: string | null;
  spec_section: { id: number; label: string } | null;
  received_from: { id: number; name: string } | null;
  responsible_contractor: { id: number; name: string } | null;
  created_by: { id: number; name: string } | null;
  submit_by: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project: { id: number; name: string } | null;
};

export function listProjectSubmittals(
  client: ProcoreClient,
  projectId: number,
  params?: Record<string, string>
): AsyncGenerator<ProcoreSubmittal[], void, undefined> {
  return client.listAll<ProcoreSubmittal>(
    `/projects/${projectId}/submittals`,
    params
  );
}
