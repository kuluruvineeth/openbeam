import posthog from "posthog-js";

function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }
  posthog.capture(event, properties);
}

export const productEvents = {
  searchExecuted: (query: string, resultCount: number, latencyMs: number) =>
    capture("search_executed", {
      query,
      result_count: resultCount,
      latency_ms: latencyMs,
    }),

  searchResultClicked: (position: number, documentType: string) =>
    capture("search_result_clicked", { position, document_type: documentType }),

  searchRefined: (originalQuery: string, refinedQuery: string) =>
    capture("search_refined", {
      original_query: originalQuery,
      refined_query: refinedQuery,
    }),

  connectorSetupStarted: (type: string) =>
    capture("connector_setup_started", { connector_type: type }),

  connectorConnected: (type: string) =>
    capture("connector_connected", { connector_type: type }),

  connectorSyncCompleted: (type: string, documentsCount: number) =>
    capture("connector_sync_completed", {
      connector_type: type,
      documents_count: documentsCount,
    }),

  agentCreated: (type: string) =>
    capture("agent_created", { agent_type: type }),

  agentMessageSent: () => capture("agent_message_sent"),

  agentToolUsed: (toolName: string) =>
    capture("agent_tool_used", { tool_name: toolName }),

  firstSearchCompleted: () => capture("first_search_completed"),

  firstConnectorAdded: () => capture("first_connector_added"),

  threeConnectorsAdded: () => capture("three_connectors_added"),

  teamCreated: () => capture("team_created"),

  teamMemberInvited: () => capture("team_member_invited"),
};
