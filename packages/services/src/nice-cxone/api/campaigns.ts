import type { NiceCxoneClient } from "../client";

export type CxoneCampaign = {
  campaignId: number;
  campaignName: string;
  description?: string;
  isActive: boolean;
  isDialer?: boolean;
  notes?: string;
  lastUpdateTime?: string;
  skills?: Array<{
    skillId: number;
    skillName?: string;
  }>;
};

export function listAllCampaigns(
  client: NiceCxoneClient,
  params?: Record<string, string>
): AsyncGenerator<CxoneCampaign[], void, undefined> {
  return client.listPaged<CxoneCampaign>("/campaigns", "campaigns", params);
}
