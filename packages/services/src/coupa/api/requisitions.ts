import type { CoupaClient } from "../client";

export type CoupaRequisition = {
  id: number;
  "requisition-number"?: string;
  status: string;
  justification?: string;
  "created-at": string;
  "updated-at": string;
  "requested-by"?: { id: number; login: string; fullname?: string };
  department?: { id: number; name: string };
  currency?: { code: string };
  total?: string;
  "requisition-lines"?: Array<{
    id: number;
    description?: string;
    quantity?: string;
    "unit-price"?: string;
    total?: string;
  }>;
};

export function listAllRequisitions(
  client: CoupaClient,
  params?: Record<string, string>
): AsyncGenerator<CoupaRequisition[], void, undefined> {
  return client.listAll<CoupaRequisition>("/requisitions", params);
}

export function listRequisitionsUpdatedSince(
  client: CoupaClient,
  since: string
): AsyncGenerator<CoupaRequisition[], void, undefined> {
  return client.listAll<CoupaRequisition>("/requisitions", {
    "updated_at[gt]": since,
  });
}
