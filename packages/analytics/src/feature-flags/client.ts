import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export type FeatureFlagValue = boolean | string | undefined;

export const featureFlags = {
  isEnabled: (flag: string): boolean => {
    const client = getBrowserClient();
    return client.isFeatureEnabled(flag) ?? false;
  },

  getValue: <T extends FeatureFlagValue>(flag: string, defaultValue: T): T => {
    const client = getBrowserClient();
    const value = client.getFeatureFlag(flag);
    return (value as T) ?? defaultValue;
  },

  getPayload: <T>(flag: string): T | undefined => {
    const client = getBrowserClient();
    return client.getFeatureFlagPayload(flag) as T | undefined;
  },

  isEnabledServer: async (
    flag: string,
    distinctId: string,
    groups?: Record<string, string>
  ): Promise<boolean> => {
    const client = getServerClient();
    return (
      (await client.isFeatureEnabled(flag, distinctId, { groups })) ?? false
    );
  },

  getValueServer: async <T extends FeatureFlagValue>(
    flag: string,
    distinctId: string,
    defaultValue: T,
    groups?: Record<string, string>
  ): Promise<T> => {
    const client = getServerClient();
    const value = await client.getFeatureFlag(flag, distinctId, { groups });
    return (value as T) ?? defaultValue;
  },

  getPayloadServer: async <T>(
    flag: string,
    distinctId: string,
    _groups?: Record<string, string>
  ): Promise<T | undefined> => {
    const client = getServerClient();
    return (await client.getFeatureFlagPayload(flag, distinctId)) as
      | T
      | undefined;
  },

  getAllFlagsServer: async (
    distinctId: string,
    groups?: Record<string, string>
  ): Promise<Record<string, boolean | string>> => {
    const client = getServerClient();
    return (await client.getAllFlags(distinctId, { groups })) ?? {};
  },

  reload: async (): Promise<void> => {
    const client = getBrowserClient();
    await client.reloadFeatureFlags();
  },

  onFlagsLoaded: (callback: (flagNames: string[]) => void): (() => void) => {
    const client = getBrowserClient();
    return client.onFeatureFlags(callback);
  },
};

export function createFeatureFlagContext(
  distinctId: string,
  groups?: Record<string, string>
): {
  isEnabled: (flag: string) => Promise<boolean>;
  getValue: <T extends FeatureFlagValue>(
    flag: string,
    defaultValue: T
  ) => Promise<T>;
  getPayload: <T>(flag: string) => Promise<T | undefined>;
  getAllFlags: () => Promise<Record<string, boolean | string>>;
} {
  return {
    isEnabled: (flag: string) =>
      featureFlags.isEnabledServer(flag, distinctId, groups),
    getValue: <T extends FeatureFlagValue>(flag: string, defaultValue: T) =>
      featureFlags.getValueServer(flag, distinctId, defaultValue, groups),
    getPayload: <T>(flag: string) =>
      featureFlags.getPayloadServer<T>(flag, distinctId, groups),
    getAllFlags: () => featureFlags.getAllFlagsServer(distinctId, groups),
  };
}
