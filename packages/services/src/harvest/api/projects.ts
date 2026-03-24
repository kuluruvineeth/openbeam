import type { HarvestClient } from "../client";

export type HarvestProject = {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  is_billable: boolean;
  is_fixed_fee: boolean;
  bill_by: string;
  budget: number | null;
  budget_by: string;
  budget_is_monthly: boolean;
  notify_when_over_budget: boolean;
  over_budget_notification_percentage: number;
  show_budget_to_all: boolean;
  cost_budget: number | null;
  cost_budget_include_expenses: boolean;
  fee: number | null;
  notes: string;
  starts_on: string | null;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
  client: { id: number; name: string; currency: string };
};

export function listAllProjects(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestProject[], void, undefined> {
  return client.paginate<HarvestProject>("/projects", "projects", params);
}
