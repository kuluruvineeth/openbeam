import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface OrganizationProperties {
  name: string;
  domain: string;
  teamCount: number;
  totalUsers: number;
  totalDocuments: number;
  plan: string;
  contractType: "monthly" | "annual" | "multi_year";
  contractStartDate?: string;
  contractEndDate?: string;
  accountManager?: string;
  tier: "standard" | "premium" | "strategic";
}

export interface OrganizationActivityMetrics {
  totalActiveTeams: number;
  totalActiveUsers: number;
  totalSearches: number;
  totalAiInteractions: number;
  avgSearchesPerTeam: number;
  avgUsersPerTeam: number;
  featureAdoption: Record<string, number>;
}

export const organizationAnalytics = {
  identify: (orgId: string, properties: OrganizationProperties) => {
    getBrowserClient().group("organization", orgId, properties);
  },

  identifyServer: (orgId: string, properties: OrganizationProperties) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "organization",
      groupKey: orgId,
      properties,
    });
  },

  updateMetrics: (orgId: string, metrics: OrganizationActivityMetrics) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "organization",
      groupKey: orgId,
      properties: {
        ...metrics,
        metricsUpdatedAt: new Date().toISOString(),
      },
    });
  },

  associateTeam: (teamId: string, orgId: string) => {
    const client = getServerClient();
    client.capture({
      distinctId: `team:${teamId}`,
      event: "team_joined_organization",
      properties: {
        organization_id: orgId,
      },
      groups: { organization: orgId },
    });
  },

  updateProperty: (orgId: string, property: string, value: unknown) => {
    const client = getServerClient();
    client.groupIdentify({
      groupType: "organization",
      groupKey: orgId,
      properties: {
        [property]: value,
        [`${property}_updated_at`]: new Date().toISOString(),
      },
    });
  },
};
