import type { NiceCxoneClient } from "../client";

export type CxoneSkill = {
  skillId: number;
  skillName: string;
  mediaTypeId?: number;
  mediaTypeName?: string;
  campaignId?: number;
  campaignName?: string;
  isActive: boolean;
  isOutbound?: boolean;
  isDialer?: boolean;
  isNaturalCalling?: boolean;
  serviceLevelGoal?: number;
  serviceLevelThreshold?: number;
  agentCount?: number;
  notes?: string;
  lastUpdateTime?: string;
};

export function listAllSkills(
  client: NiceCxoneClient,
  params?: Record<string, string>
): AsyncGenerator<CxoneSkill[], void, undefined> {
  return client.listPaged<CxoneSkill>("/skills", "skills", params);
}
