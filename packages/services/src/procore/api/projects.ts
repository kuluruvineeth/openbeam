import type { ProcoreClient } from "../client";

export type ProcoreProject = {
  id: number;
  name: string;
  display_name: string;
  project_number: string | null;
  address: string | null;
  city: string | null;
  state_code: string | null;
  zip: string | null;
  country_code: string | null;
  stage: string | null;
  active: boolean;
  start_date: string | null;
  estimated_completion_date: string | null;
  actual_start_date: string | null;
  completion_date: string | null;
  total_value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  company: { id: number; name: string } | null;
};

export function listAllProjects(
  client: ProcoreClient,
  params?: Record<string, string>
): AsyncGenerator<ProcoreProject[], void, undefined> {
  return client.listAll<ProcoreProject>("/projects", params);
}
