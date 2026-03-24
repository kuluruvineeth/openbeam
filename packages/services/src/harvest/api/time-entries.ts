import type { HarvestClient } from "../client";

export type HarvestTimeEntry = {
  id: number;
  spent_date: string;
  hours: number;
  hours_without_timer: number;
  rounded_hours: number;
  notes: string | null;
  is_locked: boolean;
  is_closed: boolean;
  is_billed: boolean;
  is_running: boolean;
  billable: boolean;
  budgeted: boolean;
  billable_rate: number | null;
  cost_rate: number | null;
  created_at: string;
  updated_at: string;
  started_time: string | null;
  ended_time: string | null;
  timer_started_at: string | null;
  user: { id: number; name: string };
  client: { id: number; name: string; currency: string };
  project: { id: number; name: string; code: string };
  task: { id: number; name: string };
  user_assignment: { id: number; is_project_manager: boolean };
  task_assignment: { id: number; billable: boolean; budget: number | null };
  invoice: { id: number; number: string } | null;
  external_reference: { id: string; permalink: string } | null;
};

export function listAllTimeEntries(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestTimeEntry[], void, undefined> {
  return client.paginate<HarvestTimeEntry>(
    "/time_entries",
    "time_entries",
    params
  );
}
