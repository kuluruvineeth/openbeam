import type { NiceCxoneClient } from "../client";

export type CxoneAgent = {
  agentId: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  emailAddress?: string;
  userName?: string;
  teamId?: number;
  teamName?: string;
  profileId?: number;
  profileName?: string;
  isActive: boolean;
  isBillable?: boolean;
  isDialer?: boolean;
  useTeamMaxConcurrentChats?: boolean;
  lastLogin?: string;
  lastUpdated?: string;
  internalId?: string;
  skills?: Array<{
    skillId: number;
    skillName?: string;
    isActive?: boolean;
    proficiency?: number;
  }>;
};

export function listAllAgents(
  client: NiceCxoneClient,
  params?: Record<string, string>
): AsyncGenerator<CxoneAgent[], void, undefined> {
  return client.listPaged<CxoneAgent>("/agents", "agents", params);
}

export function getAgent(
  client: NiceCxoneClient,
  agentId: number
): Promise<CxoneAgent> {
  return client.get<CxoneAgent>(`/agents/${agentId}`);
}
