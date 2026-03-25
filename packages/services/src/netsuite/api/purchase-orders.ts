import type { NetsuiteClient } from "../client";

export type NetsuitePurchaseOrder = {
  id: string;
  tranId?: string;
  tranDate?: string;
  status?: { id: string; refName?: string };
  entity?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  currency?: { id: string; refName?: string };
  total?: number;
  memo?: string;
  dueDate?: string;
  expectedReceiptDate?: string;
  employee?: { id: string; refName?: string };
  department?: { id: string; refName?: string };
  dateCreated?: string;
  lastModifiedDate?: string;
  item?: {
    items?: Array<{
      item?: { id: string; refName?: string };
      description?: string;
      quantity?: number;
      rate?: number;
      amount?: number;
    }>;
  };
};

export function listAllPurchaseOrders(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuitePurchaseOrder[], void, undefined> {
  return client.listAll<NetsuitePurchaseOrder>("/purchaseOrder", params);
}

export function listPurchaseOrdersUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuitePurchaseOrder[], void, undefined> {
  return client.listAll<NetsuitePurchaseOrder>("/purchaseOrder", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
