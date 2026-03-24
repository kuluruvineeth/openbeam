import type { CoupaClient } from "../client";

export type CoupaExpenseReport = {
  id: number;
  title: string;
  status: string;
  total?: string;
  currency?: { code: string };
  "submitted-at"?: string;
  "created-at": string;
  "updated-at": string;
  "created-by"?: { id: number; login: string; fullname?: string };
  department?: { id: number; name: string };
  "expense-lines"?: Array<{
    id: number;
    description?: string;
    amount?: string;
    "expense-date"?: string;
    "expense-category"?: string;
  }>;
};

export function listAllExpenseReports(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaExpenseReport[], void, undefined> {
  return client.listAll<CoupaExpenseReport>("/expense_reports", params);
}

export function listExpenseReportsUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaExpenseReport[], void, undefined> {
  return client.listAll<CoupaExpenseReport>("/expense_reports", {
    "updated_at[gt]": since,
  });
}
