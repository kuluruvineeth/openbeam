import type { CoupaClient } from "../client";

export type CoupaSupplier = {
  id: number;
  name: string;
  number?: string;
  status: string;
  "payment-term"?: { id: number; code: string };
  "primary-contact"?: {
    id: number;
    email?: string;
    "name-given"?: string;
    "name-family"?: string;
    "phone-work"?: string;
  };
  "primary-address"?: {
    street1?: string;
    city?: string;
    state?: string;
    "postal-code"?: string;
    country?: { code?: string };
  };
  "tax-id"?: string;
  website?: string;
  "created-at": string;
  "updated-at": string;
};

export function listAllSuppliers(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaSupplier[], void, undefined> {
  return client.listAll<CoupaSupplier>("/suppliers", params);
}

export function listSuppliersUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaSupplier[], void, undefined> {
  return client.listAll<CoupaSupplier>("/suppliers", {
    "updated_at[gt]": since,
  });
}
