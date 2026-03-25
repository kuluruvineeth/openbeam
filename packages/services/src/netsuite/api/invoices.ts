import type { NetsuiteClient } from "../client";

export type NetsuiteInvoice = {
  id: string;
  tranId?: string;
  tranDate?: string;
  status?: { id: string; refName?: string };
  entity?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  currency?: { id: string; refName?: string };
  total?: number;
  amountRemaining?: number;
  dueDate?: string;
  memo?: string;
  terms?: { id: string; refName?: string };
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

export function listAllInvoices(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuiteInvoice[], void, undefined> {
  return client.listAll<NetsuiteInvoice>("/invoice", params);
}

export function listInvoicesUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuiteInvoice[], void, undefined> {
  return client.listAll<NetsuiteInvoice>("/invoice", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
