import type { CoupaClient } from "../client";

export type CoupaPurchaseOrder = {
  id: number;
  "po-number": string;
  status: string;
  "order-header-id"?: number;
  "created-at": string;
  "updated-at": string;
  "requested-by"?: { id: number; login: string; fullname?: string };
  "ship-to-address"?: {
    street1?: string;
    city?: string;
    state?: string;
    "postal-code"?: string;
    country?: { code?: string };
  };
  supplier?: { id: number; name: string; number?: string };
  currency?: { code: string };
  "total-with-tax"?: string;
  "order-lines"?: Array<{
    id: number;
    description?: string;
    quantity?: string;
    price?: string;
    total?: string;
  }>;
};

export function listAllPurchaseOrders(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaPurchaseOrder[], void, undefined> {
  return client.listAll<CoupaPurchaseOrder>("/purchase_orders", params);
}

export function listPurchaseOrdersUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaPurchaseOrder[], void, undefined> {
  return client.listAll<CoupaPurchaseOrder>("/purchase_orders", {
    "updated_at[gt]": since,
  });
}
