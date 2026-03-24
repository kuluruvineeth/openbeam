import type { MarketoClient } from "../client";

export type MarketoCampaign = {
  id: number;
  name: string;
  description: string | null;
  type: string;
  programName: string | null;
  programId: number | null;
  workspaceName: string | null;
  createdAt: string;
  updatedAt: string;
  active: boolean;
};

export function listAllCampaigns(
  client: MarketoClient
): AsyncGenerator<MarketoCampaign[], void, undefined> {
  return client.listAllApi<MarketoCampaign>("/v1/campaigns.json");
}
