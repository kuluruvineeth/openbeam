import type { HarvestClient } from "../client";

export type HarvestInvoice = {
  id: number;
  client_key: string;
  number: string;
  purchase_order: string | null;
  amount: number;
  due_amount: number;
  tax: number | null;
  tax_amount: number;
  tax2: number | null;
  tax2_amount: number;
  discount: number | null;
  discount_amount: number;
  subject: string | null;
  notes: string | null;
  currency: string;
  state: string;
  period_start: string | null;
  period_end: string | null;
  issue_date: string;
  due_date: string;
  payment_term: string;
  sent_at: string | null;
  paid_at: string | null;
  paid_date: string | null;
  closed_at: string | null;
  recurring_invoice_id: number | null;
  created_at: string;
  updated_at: string;
  client: { id: number; name: string };
  estimate: { id: number } | null;
  retainer: { id: number } | null;
  creator: { id: number; name: string };
};

export function listAllInvoices(
  client: HarvestClient,
  params?: Record<string, string>
): AsyncGenerator<HarvestInvoice[], void, undefined> {
  return client.paginate<HarvestInvoice>("/invoices", "invoices", params);
}
