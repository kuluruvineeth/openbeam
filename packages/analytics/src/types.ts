export type Environment = "development" | "staging" | "production";

export type PersonProfiles = "always" | "identified_only";

export interface AnalyticsContext {
  userId?: string;
  teamId?: string;
  organizationId?: string;
  sessionId?: string;
}

export interface EventProperties {
  [key: string]: unknown;
}

export interface GroupProperties {
  [key: string]: unknown;
}

export type FeatureFlagValue = boolean | string | undefined;

export interface FeatureFlagPayload {
  [key: string]: unknown;
}
