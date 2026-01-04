import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface ConnectorSetupStartedEvent {
  connectorType: string;
  setupSessionId: string;
  entryPoint: "onboarding" | "settings" | "search_prompt" | "recommendation";
}

export interface ConnectorOAuthCompletedEvent {
  connectorType: string;
  setupSessionId: string;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  timeToCompleteMs: number;
  scopesRequested: string[];
  scopesGranted: string[];
}

export interface ConnectorConfiguredEvent {
  connectorType: string;
  connectorId: string;
  setupSessionId: string;
  syncFrequency: "realtime" | "hourly" | "daily" | "manual";
  initialSyncType: "full" | "incremental" | "recent_only";
  customSettings: Record<string, unknown>;
}

export interface ConnectorSyncCompletedEvent {
  connectorId: string;
  connectorType: string;
  syncId: string;
  syncType: "full" | "incremental" | "webhook";
  documentsAdded: number;
  documentsUpdated: number;
  documentsDeleted: number;
  totalDocuments: number;
  durationMs: number;
  bytesProcessed: number;
  success: boolean;
  errorCode?: string;
  warningCount: number;
}

export interface ConnectorErrorEvent {
  connectorId: string;
  connectorType: string;
  errorType:
    | "auth_expired"
    | "rate_limited"
    | "api_error"
    | "config_invalid"
    | "permission_denied";
  errorCode: string;
  errorMessage: string;
  isRecoverable: boolean;
  suggestedAction?: string;
}

export interface ConnectorDisconnectedEvent {
  connectorId: string;
  connectorType: string;
  reason:
    | "user_initiated"
    | "auth_expired"
    | "error"
    | "admin_revoked"
    | "team_deleted";
  documentsRemoved: number;
  connectionDurationDays: number;
}

export interface ConnectorHealthCheckEvent {
  connectorId: string;
  connectorType: string;
  status: "healthy" | "degraded" | "failing";
  lastSyncAgo: number;
  errorRate: number;
}

export const connectorEvents = {
  setupStarted: (event: ConnectorSetupStartedEvent) => {
    getBrowserClient().capture("connector_setup_started", event);
  },

  oauthCompleted: (event: ConnectorOAuthCompletedEvent) => {
    getBrowserClient().capture("connector_oauth_completed", event);
  },

  configured: (event: ConnectorConfiguredEvent) => {
    getBrowserClient().capture("connector_configured", {
      ...event,
      $set: {
        connectors_configured_count: { $increment: 1 },
      },
    });
  },

  disconnected: (event: ConnectorDisconnectedEvent) => {
    getBrowserClient().capture("connector_disconnected", event);
  },

  healthCheck: (event: ConnectorHealthCheckEvent) => {
    getBrowserClient().capture("connector_health_check", event);
  },
};

export const connectorEventsServer = {
  syncCompleted: (event: ConnectorSyncCompletedEvent, teamId: string) => {
    const client = getServerClient();
    client.capture({
      distinctId: `connector:${event.connectorId}`,
      event: "connector_sync_completed",
      properties: event,
      groups: { team: teamId },
    });
  },

  error: (event: ConnectorErrorEvent, teamId: string) => {
    const client = getServerClient();
    client.capture({
      distinctId: `connector:${event.connectorId}`,
      event: "connector_error",
      properties: event,
      groups: { team: teamId },
    });
  },

  healthCheck: (event: ConnectorHealthCheckEvent, teamId: string) => {
    const client = getServerClient();
    client.capture({
      distinctId: `connector:${event.connectorId}`,
      event: "connector_health_check",
      properties: event,
      groups: { team: teamId },
    });
  },
};
