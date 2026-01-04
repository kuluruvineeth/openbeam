import { getBrowserClient, initBrowserClient } from "../clients/browser";
import { type AnalyticsConfig, initializeAnalytics } from "../config";

export interface ConsentPreferences {
  analytics: boolean;
  sessionRecording: boolean;
  featureFlags: boolean;
  marketing: boolean;
}

export interface GDPRCompliantConfig extends Partial<AnalyticsConfig> {
  apiKey: string;
  requireExplicitConsent?: boolean;
  defaultConsent?: ConsentPreferences;
  onConsentRequired?: () => void;
  cookieDomain?: string;
}

const CONSENT_STORAGE_KEY = "openplane_consent";
const CONSENT_VERSION = "1.0";

export function updateConsentPreferences(
  preferences: ConsentPreferences
): void {
  const client = getBrowserClient();

  if (preferences.analytics) {
    client.opt_in_capturing();
  } else {
    client.opt_out_capturing();
  }

  if (preferences.sessionRecording) {
    client.startSessionRecording();
  } else {
    client.stopSessionRecording();
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        ...preferences,
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
      })
    );
  }

  client.capture("consent_updated", {
    ...preferences,
    consent_version: CONSENT_VERSION,
    consent_timestamp: new Date().toISOString(),
  });
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

  const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      analytics: parsed.analytics ?? false,
      sessionRecording: parsed.sessionRecording ?? false,
      featureFlags: parsed.featureFlags ?? false,
      marketing: parsed.marketing ?? false,
    };
  } catch {
    return null;
  }
}

export function hasGivenConsent(): boolean {
  return getConsentPreferences() !== null;
}

export function revokeConsent(): void {
  const client = getBrowserClient();

  client.opt_out_capturing();
  client.stopSessionRecording();

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  }

  client.reset();
}

export function requestDataDeletion(userId: string): void {
  const client = getBrowserClient();

  client.capture("data_deletion_requested", {
    user_id: userId,
    requested_at: new Date().toISOString(),
  });

  client.reset();

  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  }
}

export function requestDataExport(userId: string): void {
  const client = getBrowserClient();

  client.capture("data_export_requested", {
    user_id: userId,
    requested_at: new Date().toISOString(),
  });
}

export function getDefaultConsentPreferences(
  isEU: boolean
): ConsentPreferences {
  if (isEU) {
    return {
      analytics: false,
      sessionRecording: false,
      featureFlags: true,
      marketing: false,
    };
  }

  return {
    analytics: true,
    sessionRecording: true,
    featureFlags: true,
    marketing: false,
  };
}

export function isEUUser(): boolean {
  if (typeof Intl === "undefined") {
    return false;
  }

  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const euTimeZones = [
      "Europe/",
      "Atlantic/Azores",
      "Atlantic/Canary",
      "Atlantic/Faroe",
      "Atlantic/Madeira",
    ];
    return euTimeZones.some((tz) => timeZone.startsWith(tz));
  } catch {
    return false;
  }
}

export function initWithGDPRCompliance(config: GDPRCompliantConfig): {
  analytics: ReturnType<typeof initBrowserClient>;
  requiresConsent: boolean;
  showConsentBanner: boolean;
} {
  const isEU = isEUUser();
  const requireExplicitConsent = config.requireExplicitConsent ?? isEU;
  const existingConsent = getConsentPreferences();
  const showConsentBanner = requireExplicitConsent && !existingConsent;

  const defaultConsent =
    config.defaultConsent ?? getDefaultConsentPreferences(isEU);

  initializeAnalytics({
    ...config,
    disabled: requireExplicitConsent && !existingConsent?.analytics,
    enableSessionRecording:
      existingConsent?.sessionRecording ?? defaultConsent.sessionRecording,
    enableFeatureFlags:
      existingConsent?.featureFlags ?? defaultConsent.featureFlags,
  });

  const client = initBrowserClient({
    ...config,
    disabled: requireExplicitConsent && !existingConsent?.analytics,
    enableSessionRecording:
      existingConsent?.sessionRecording ?? defaultConsent.sessionRecording,
    enableFeatureFlags:
      existingConsent?.featureFlags ?? defaultConsent.featureFlags,
  });

  if (showConsentBanner && config.onConsentRequired) {
    config.onConsentRequired();
  }

  if (existingConsent) {
    updateConsentPreferences(existingConsent);
  }

  return {
    analytics: client,
    requiresConsent: requireExplicitConsent,
    showConsentBanner,
  };
}

export function handleConsentGiven(preferences: ConsentPreferences): void {
  updateConsentPreferences(preferences);

  if (preferences.analytics) {
    const client = getBrowserClient();
    client.opt_in_capturing();
  }
}

export function detectRegion(): {
  isEU: boolean;
  isCalifornia: boolean;
  requiresConsent: boolean;
} {
  const isEU = isEUUser();

  let isCalifornia = false;
  if (typeof Intl !== "undefined") {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      isCalifornia = timeZone === "America/Los_Angeles";
    } catch {
      isCalifornia = false;
    }
  }

  return {
    isEU,
    isCalifornia,
    requiresConsent: isEU || isCalifornia,
  };
}
