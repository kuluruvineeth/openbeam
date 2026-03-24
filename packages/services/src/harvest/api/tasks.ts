import type { HarvestClient } from "../client";

export type HarvestTask = {
  id: number;
  name: string;
  billable_by_default: boolean;
  default_hourly_rate: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function listAllTasks(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestTask[], void, undefined> {
  return client.paginate<HarvestTask>("/tasks", "tasks", params);
}
