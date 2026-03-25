import type { NetsuiteClient } from "../client";

export type NetsuiteCustomer = {
  id: string;
  companyName?: string;
  entityId?: string;
  email?: string;
  phone?: string;
  entityStatus?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  currency?: { id: string; refName?: string };
  balance?: number;
  salesRep?: { id: string; refName?: string };
  category?: { id: string; refName?: string };
  terms?: { id: string; refName?: string };
  dateCreated?: string;
  lastModifiedDate?: string;
  url?: string;
  comments?: string;
  defaultAddress?: string;
};

export function listAllCustomers(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuiteCustomer[], void, undefined> {
  return client.listAll<NetsuiteCustomer>("/customer", params);
}

export function listCustomersUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuiteCustomer[], void, undefined> {
  return client.listAll<NetsuiteCustomer>("/customer", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
