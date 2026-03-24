import type { HarvestClient } from "../client";

export type HarvestExpense = {
  id: number;
  notes: string | null;
  total_cost: number;
  units: number;
  is_closed: boolean;
  is_locked: boolean;
  is_billed: boolean;
  locked_reason: string | null;
  spent_date: string;
  billable: boolean;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string };
  project: { id: number; name: string; code: string };
  expense_category: {
    id: number;
    name: string;
    unit_price: number | null;
    unit_name: string | null;
  };
  client: { id: number; name: string; currency: string };
  invoice: { id: number; number: string } | null;
  receipt: {
    url: string;
    file_name: string;
    file_size: number;
    content_type: string;
  } | null;
};

export function listAllExpenses(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestExpense[], void, undefined> {
  return client.paginate<HarvestExpense>("/expenses", "expenses", params);
}
