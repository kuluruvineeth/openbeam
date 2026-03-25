import type { NiceCxoneClient } from "../client";

export type CxoneTeam = {
  teamId: number;
  teamName: string;
  description?: string;
  isActive: boolean;
  teamLeadId?: number;
  teamLeadName?: string;
  inViewAgentCount?: number;
  maxConcurrentChats?: number;
  lastUpdateTime?: string;
  notes?: string;
};

export function listAllTeams(
  client: NiceCxoneClient,
  params?: Record<string, string>
): AsyncGenerator<CxoneTeam[], void, undefined> {
  return client.listPaged<CxoneTeam>("/teams", "teams", params);
}
