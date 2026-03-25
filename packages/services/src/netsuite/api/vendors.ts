import type { NetsuiteClient } from "../client";

export type NetsuiteVendor = {
  id: string;
  companyName?: string;
  entityId?: string;
  email?: string;
  phone?: string;
  entityStatus?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  currency?: { id: string; refName?: string };
  balance?: number;
  terms?: { id: string; refName?: string };
  category?: { id: string; refName?: string };
  dateCreated?: string;
  lastModifiedDate?: string;
  url?: string;
  comments?: string;
  defaultAddress?: string;
  taxIdNum?: string;
};

export function listAllVendors(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuiteVendor[], void, undefined> {
  return client.listAll<NetsuiteVendor>("/vendor", params);
}

export function listVendorsUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuiteVendor[], void, undefined> {
  return client.listAll<NetsuiteVendor>("/vendor", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
