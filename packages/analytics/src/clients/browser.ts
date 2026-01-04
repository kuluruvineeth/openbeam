import type { PostHog } from "posthog-js";
import posthog from "posthog-js";
import {
  type AnalyticsConfig,
  getAnalyticsConfig,
  isAnalyticsInitialized,
} from "../config";

let client: PostHog | null = null;

function createNoopClient(): PostHog {
  const noop = (): void => {
    return;
  };
  const noopReturn =
    <T>(val: T) =>
    () =>
      val;

  return {
    capture: noop,
    identify: noop,
    reset: noop,
    register: noop,
    unregister: noop,
    group: noop,
    setPersonProperties: noop,
    isFeatureEnabled: noopReturn(false),
    getFeatureFlag: noopReturn(undefined),
    getFeatureFlagPayload: noopReturn(undefined),
    onFeatureFlags: noopReturn(noop),
    reloadFeatureFlags: (): Promise<void> => Promise.resolve(),
    startSessionRecording: noop,
    stopSessionRecording: noop,
    sessionRecordingStarted: noopReturn(false),
    opt_in_capturing: noop,
    opt_out_capturing: noop,
    debug: noop,
  } as unknown as PostHog;
}

export function initBrowserClient(config?: Partial<AnalyticsConfig>): PostHog {
  if (client) {
    return client;
  }
  if (typeof window === "undefined") {
    return createNoopClient();
  }

  const cfg = config
    ? { ...getAnalyticsConfig(), ...config }
    : getAnalyticsConfig();

  if (cfg.disabled) {
    return createNoopClient();
  }

  posthog.init(cfg.apiKey, {
    api_host: cfg.host,
    person_profiles: cfg.personProfiles,
    defaults: "2025-11-30",
    autocapture: {
      dom_event_allowlist: ["click", "submit", "change"],
      url_allowlist: [".*"],
      element_allowlist: ["a", "button", "form", "input", "select", "textarea"],
      css_selector_allowlist: ["[data-ph-capture]"],
    },
    disable_session_recording: !cfg.enableSessionRecording,
    session_recording: {
      maskAllInputs: cfg.maskAllInputs,
      maskTextSelector: cfg.maskAllText ? "*" : undefined,
      recordCrossOriginIframes: false,
    },
    advanced_disable_feature_flags: !cfg.enableFeatureFlags,
    feature_flag_request_timeout_ms: cfg.featureFlagsRequestTimeoutMs,
    bootstrap: cfg.bootstrapFeatureFlags
      ? {
          featureFlags: cfg.bootstrapFeatureFlags as Record<
            string,
            string | boolean
          >,
        }
      : undefined,
    loaded: (ph) => {
      if (cfg.debug) {
        ph.debug();
      }
      ph.register({
        $lib_version: "0.1.0",
        environment: cfg.environment,
      });
    },
  });

  client = posthog;
  return client;
}

export function getBrowserClient(): PostHog {
  if (!client) {
    if (!isAnalyticsInitialized()) {
      throw new Error(
        "Analytics not initialized. Call initializeAnalytics() first."
      );
    }
    return initBrowserClient();
  }
  return client;
}

export function resetBrowserClient(): void {
  if (client) {
    client.reset();
  }
}

export function shutdownBrowserClient(): void {
  if (client) {
    client.reset();
    client = null;
  }
}
