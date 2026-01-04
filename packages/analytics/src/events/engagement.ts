import { getBrowserClient } from "../clients/browser";

export type Feature =
  | "search"
  | "ai_assistant"
  | "document_preview"
  | "document_sharing"
  | "bookmarks"
  | "collections"
  | "advanced_filters"
  | "keyboard_shortcuts"
  | "bulk_actions"
  | "analytics_dashboard"
  | "team_management"
  | "api_access"
  | "webhooks"
  | "sso"
  | "audit_logs";

export interface FeatureFirstUseEvent {
  feature: Feature;
  discoveryPath:
    | "organic"
    | "tooltip"
    | "onboarding"
    | "help_center"
    | "marketing";
  timeFromSignupMs: number;
}

export interface FeatureUsageEvent {
  feature: Feature;
  action: string;
  sessionUsageCount: number;
  lifetimeUsageCount: number;
  context: string;
}

export interface KeyboardShortcutUsedEvent {
  shortcut: string;
  action: string;
  context: "global" | "search" | "document" | "ai_assistant";
}

export interface SessionEndEvent {
  sessionDurationMs: number;
  searchesPerformed: number;
  documentsViewed: number;
  aiInteractions: number;
  actionsPerformed: number;
  featuresUsed: Feature[];
  pagesViewed: string[];
}

export interface PageViewEvent {
  pageName: string;
  pagePath: string;
  referrer?: string;
  timeOnPreviousPageMs?: number;
}

export const engagementEvents = {
  featureFirstUse: (event: FeatureFirstUseEvent) => {
    getBrowserClient().capture("feature_first_use", {
      ...event,
      $set: {
        [`first_used_${event.feature}`]: new Date().toISOString(),
      },
      $set_once: {
        first_feature_used: event.feature,
      },
    });
  },

  featureUsage: (event: FeatureUsageEvent) => {
    getBrowserClient().capture("feature_usage", event);
  },

  keyboardShortcutUsed: (event: KeyboardShortcutUsedEvent) => {
    getBrowserClient().capture("keyboard_shortcut_used", event);
  },

  sessionEnd: (event: SessionEndEvent) => {
    getBrowserClient().capture("session_end", event);
  },

  pageView: (event: PageViewEvent) => {
    getBrowserClient().capture("$pageview", {
      $current_url: event.pagePath,
      page_name: event.pageName,
      referrer: event.referrer,
      time_on_previous_page_ms: event.timeOnPreviousPageMs,
    });
  },
};
