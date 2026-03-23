import type { PipedriveClient } from "../client";

export type PipedriveDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  status: string;
  stage_id: number;
  pipeline_id: number;
  expected_close_date: string | null;
  probability: number | null;
  lost_reason: string | null;
  add_time: string;
  update_time: string;
  stage_order_nr: number;
  person_id: { value: number; name: string } | null;
  org_id: { value: number; name: string } | null;
  user_id: { id: number; name: string; email: string } | null;
  won_time: string | null;
  lost_time: string | null;
  close_time: string | null;
  visible_to: string;
};

export function listAllDeals(
  client: PipedriveClient,
  params?: Record<string, string>
): AsyncGenerator<PipedriveDeal[], void, undefined> {
  return client.listAll<PipedriveDeal>("/deals", params);
}

export function listDealsUpdatedSince(
  client: PipedriveClient,
  sinceTimestamp: string
): AsyncGenerator<PipedriveDeal[], void, undefined> {
  return client.listAll<PipedriveDeal>("/recents", {
    since_timestamp: sinceTimestamp,
    items: "deal",
  });
}
