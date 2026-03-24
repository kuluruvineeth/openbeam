import type { CoupaClient } from "../client";

export type CoupaContract = {
  id: number;
  name: string;
  number?: string;
  status: string;
  "start-date"?: string;
  "end-date"?: string;
  "max-value"?: string;
  "min-value"?: string;
  currency?: { code: string };
  supplier?: { id: number; name: string; number?: string };
  "created-by"?: { id: number; login: string; fullname?: string };
  "created-at": string;
  "updated-at": string;
  description?: string;
  "contract-terms"?: string;
};

export function listAllContracts(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaContract[], void, undefined> {
  return client.listAll<CoupaContract>("/contracts", params);
}

export function listContractsUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaContract[], void, undefined> {
  return client.listAll<CoupaContract>("/contracts", {
    "updated_at[gt]": since,
  });
}
