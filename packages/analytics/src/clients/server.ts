import { PostHog } from "posthog-node";
import { type AnalyticsConfig, getAnalyticsConfig } from "../config";

let client: PostHog | null = null;

function createNoopServerClient(): PostHog {
  const noop = (): void => {
    return;
  };
  const noopAsync = (): Promise<void> => Promise.resolve();
  const noopReturn =
    <T>(val: T) =>
    async () =>
      val;

  return {
    capture: noop,
    identify: noop,
    groupIdentify: noop,
    alias: noop,
    isFeatureEnabled: noopReturn(false),
    getFeatureFlag: noopReturn(undefined),
    getAllFlags: noopReturn({}),
    getFeatureFlagPayload: noopReturn(undefined),
    reloadFeatureFlags: noopAsync,
    flush: noopAsync,
    shutdown: noopAsync,
  } as unknown as PostHog;
}

export function initServerClient(config?: Partial<AnalyticsConfig>): PostHog {
  if (client) {
    return client;
  }

  const cfg = config
    ? { ...getAnalyticsConfig(), ...config }
    : getAnalyticsConfig();

  if (cfg.disabled) {
    return createNoopServerClient();
  }

  client = new PostHog(cfg.apiKey, {
    host: cfg.host,
    disabled: cfg.disabled,
    flushAt: cfg.flushAt,
    flushInterval: cfg.flushInterval,
    featureFlagsRequestTimeoutMs: cfg.featureFlagsRequestTimeoutMs,
    disableGeoip: true,
    historicalMigration: false,
  });

  return client;
}

export function getServerClient(): PostHog {
  if (!client) {
    return initServerClient();
  }
  return client;
}

export async function shutdownServerClient(): Promise<void> {
  if (client) {
    await client.shutdown();
    client = null;
  }
}

export async function flushServerClient(): Promise<void> {
  if (client) {
    await client.flush();
  }
}

export async function captureImmediate(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
  groups?: Record<string, string>
): Promise<void> {
  const serverClient = getServerClient();
  serverClient.capture({
    distinctId,
    event,
    properties,
    groups,
    sendFeatureFlags: true,
  });
  await serverClient.flush();
}

export async function identifyImmediate(
  distinctId: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const serverClient = getServerClient();
  serverClient.identify({
    distinctId,
    properties,
  });
  await serverClient.flush();
}
