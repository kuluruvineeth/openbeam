import type { NetsuiteClient } from "../client";

export type NetsuiteSalesOrder = {
  id: string;
  tranId?: string;
  tranDate?: string;
  orderStatus?: { id: string; refName?: string };
  entity?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  currency?: { id: string; refName?: string };
  total?: number;
  memo?: string;
  shipDate?: string;
  salesRep?: { id: string; refName?: string };
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

export function listAllSalesOrders(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuiteSalesOrder[], void, undefined> {
  return client.listAll<NetsuiteSalesOrder>("/salesOrder", params);
}

export function listSalesOrdersUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuiteSalesOrder[], void, undefined> {
  return client.listAll<NetsuiteSalesOrder>("/salesOrder", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
