import type { ProcoreClient } from "../client";

export type ProcoreRfi = {
  id: number;
  number: number;
  subject: string;
  question: {
    body: string | null;
    plain_text_body: string | null;
  } | null;
  official_response: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assignee: { id: number; name: string } | null;
  responsible_contractor: { id: number; name: string } | null;
  rfi_manager: { id: number; name: string } | null;
  created_by: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  cost_code: { id: number; name: string } | null;
  spec_section: { id: number; label: string } | null;
};

export function listProjectRfis(
  client: ProcoreClient,
  projectId: number,
  params?: Record<string, string>
): AsyncGenerator<ProcoreRfi[], void, undefined> {
  return client.listAll<ProcoreRfi>(`/projects/${projectId}/rfis`, params);
}
