import type { CoupaClient } from "../client";

export type CoupaInvoice = {
  id: number;
  "invoice-number": string;
  status: string;
  "invoice-date"?: string;
  "due-date"?: string;
  "payment-date"?: string;
  "created-at": string;
  "updated-at": string;
  "created-by"?: { id: number; login: string; fullname?: string };
  supplier?: { id: number; name: string; number?: string };
  currency?: { code: string };
  "total-with-tax"?: string;
  "invoice-lines"?: Array<{
    id: number;
    description?: string;
    quantity?: string;
    price?: string;
    total?: string;
  }>;
};

export function listAllInvoices(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaInvoice[], void, undefined> {
  return client.listAll<CoupaInvoice>("/invoices", params);
}

export function listInvoicesUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaInvoice[], void, undefined> {
  return client.listAll<CoupaInvoice>("/invoices", {
    "updated_at[gt]": since,
  });
}
