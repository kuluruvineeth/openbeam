import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface SearchExecutedEvent {
  queryId: string;
  queryHash: string;
  queryLength: number;
  queryTokenCount: number;
  resultCount: number;
  searchLatencyMs: number;
  rerankLatencyMs?: number;
  totalLatencyMs: number;
  filters: {
    connectorTypes?: string[];
    dateRange?: { start: string; end: string };
    contentTypes?: string[];
  };
  searchType: "semantic" | "keyword" | "hybrid";
  isFollowUp: boolean;
  sessionSearchIndex: number;
  entryPoint: "search_bar" | "sidebar" | "command_palette" | "api";
}

export interface SearchResultClickedEvent {
  queryId: string;
  documentId: string;
  documentType: string;
  connectorType: string;
  position: number;
  pageNumber: number;
  positionOnPage: number;
  timeToClickMs: number;
  isFirstClick: boolean;
  clickIndex: number;
}

export interface SearchResultDwellEvent {
  queryId: string;
  documentId: string;
  dwellTimeMs: number;
  scrollDepthPercent: number;
  wordsCopied: number;
  linksClicked: number;
  didBookmark: boolean;
  didShare: boolean;
  didOpen: boolean;
}

export interface SearchRefinementEvent {
  originalQueryId: string;
  newQueryId: string;
  refinementType:
    | "filter_added"
    | "filter_removed"
    | "query_rewritten"
    | "suggestion_used";
  filterChanged?: string;
  previousResultCount: number;
  newResultCount: number;
}

export interface SearchZeroResultsEvent {
  queryId: string;
  queryText: string;
  queryLength: number;
  suggestedAlternatives: string[];
  suggestedConnectors: string[];
  didTryAlternative: boolean;
}

export interface SearchSatisfactionEvent {
  queryId: string;
  satisfactionScore: 1 | 2 | 3 | 4 | 5;
  feedbackType: "explicit" | "implicit";
  feedbackText?: string;
  foundWhatLookingFor: boolean;
  wouldRecommend: boolean;
}

export const searchEvents = {
  executed: (event: SearchExecutedEvent) => {
    getBrowserClient().capture("search_executed", {
      ...event,
      $set: {
        last_search_at: new Date().toISOString(),
        total_searches: { $increment: 1 },
        last_search_type: event.searchType,
        last_search_entry_point: event.entryPoint,
      },
      $set_once: {
        first_search_at: new Date().toISOString(),
      },
    });
  },

  resultClicked: (event: SearchResultClickedEvent) => {
    getBrowserClient().capture("search_result_clicked", {
      ...event,
      reciprocal_rank: 1 / event.position,
      $set: {
        last_click_at: new Date().toISOString(),
        total_result_clicks: { $increment: 1 },
        last_clicked_connector: event.connectorType,
        last_clicked_document_type: event.documentType,
      },
    });
  },

  resultDwell: (event: SearchResultDwellEvent) => {
    getBrowserClient().capture("search_result_dwell", {
      ...event,
      $set: {
        avg_dwell_time_ms: event.dwellTimeMs,
      },
    });
  },

  refined: (event: SearchRefinementEvent) => {
    getBrowserClient().capture("search_refined", {
      ...event,
      $set: {
        total_refinements: { $increment: 1 },
      },
    });
  },

  zeroResults: (event: SearchZeroResultsEvent) => {
    getBrowserClient().capture("search_zero_results", {
      ...event,
      $set: {
        total_zero_result_searches: { $increment: 1 },
      },
    });
  },

  satisfaction: (event: SearchSatisfactionEvent) => {
    getBrowserClient().capture("search_satisfaction_submitted", {
      ...event,
      $set: {
        last_satisfaction_score: event.satisfactionScore,
        last_feedback_at: new Date().toISOString(),
      },
    });
  },
};

export const searchEventsServer = {
  executed: (
    distinctId: string,
    event: SearchExecutedEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "search_executed",
      properties: {
        ...event,
        $set: {
          last_search_at: new Date().toISOString(),
          last_search_type: event.searchType,
        },
        $set_once: {
          first_search_at: new Date().toISOString(),
        },
      },
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  resultClicked: (
    distinctId: string,
    event: SearchResultClickedEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "search_result_clicked",
      properties: {
        ...event,
        reciprocal_rank: 1 / event.position,
        $set: {
          last_click_at: new Date().toISOString(),
          last_clicked_connector: event.connectorType,
        },
      },
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  zeroResults: (
    distinctId: string,
    event: SearchZeroResultsEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "search_zero_results",
      properties: event,
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  satisfaction: (
    distinctId: string,
    event: SearchSatisfactionEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "search_satisfaction_submitted",
      properties: {
        ...event,
        $set: {
          last_satisfaction_score: event.satisfactionScore,
          last_feedback_at: new Date().toISOString(),
        },
      },
      groups: teamId ? { team: teamId } : undefined,
    });
  },
};
