import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface TeamProperties {
  name: string;
  slug: string;
  plan: "free" | "starter" | "professional" | "enterprise";
  planStartedAt: string;
  memberCount: number;
  adminCount: number;
  connectorCount: number;
  documentCount: number;
  createdAt: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  region?: string;
}

export interface TeamActivityMetrics {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
  searchesLast7Days: number;
  searchesLast30Days: number;
  aiInteractionsLast30Days: number;
  avgSearchesPerActiveUser: number;
  avgAiInteractionsPerActiveUser: number;
  topConnectors: string[];
  topSearchers: string[];
}

export const teamAnalytics = {
  identify: (teamId: string, properties: TeamProperties) => {
    getBrowserClient().group("team", teamId, properties);
  },

  identifyServer: (teamId: string, properties: TeamProperties) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "team",
      groupKey: teamId,
      properties,
    });
  },

  updateMetrics: (teamId: string, metrics: TeamActivityMetrics) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "team",
      groupKey: teamId,
      properties: {
        ...metrics,
        metricsUpdatedAt: new Date().toISOString(),
      },
    });
  },

  associateUser: (_userId: string, teamId: string, role: string) => {
    const client = getBrowserClient();
    client.group("team", teamId);
    client.capture("user_joined_team", {
      team_id: teamId,
      role,
    });
  },

  dissociateUser: (_userId: string, teamId: string, reason: string) => {
    const client = getBrowserClient();
    client.capture("user_left_team", {
      team_id: teamId,
      reason,
    });
  },

  updateProperty: (teamId: string, property: string, value: unknown) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "team",
      groupKey: teamId,
      properties: {
        [property]: value,
        [`${property}_updated_at`]: new Date().toISOString(),
      },
    });
  },
};
