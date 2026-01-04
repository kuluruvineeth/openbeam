import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface AIConversationStartedEvent {
  conversationId: string;
  entryPoint: "search_bar" | "sidebar" | "command_palette" | "document_context";
  initialQueryLength: number;
  hasDocumentContext: boolean;
  documentContextCount: number;
}

export interface AIMessageSentEvent {
  conversationId: string;
  messageId: string;
  messageIndex: number;
  messageLength: number;
  hasAttachments: boolean;
  attachmentCount: number;
  attachmentTypes: string[];
  usedSuggestion: boolean;
  suggestionIndex?: number;
}

export interface AIResponseReceivedEvent {
  conversationId: string;
  messageId: string;
  messageIndex: number;
  responseLatencyMs: number;
  timeToFirstTokenMs: number;
  tokensPerSecond: number;
  responseLength: number;
  hasCitations: boolean;
  citationCount: number;
  hasActions: boolean;
  actionCount: number;
  actionTypes: string[];
  model: string;
  provider: string;
  wasStreamed: boolean;
  wasInterrupted: boolean;
}

export interface AICitationClickedEvent {
  conversationId: string;
  messageId: string;
  citationIndex: number;
  documentId: string;
  documentType: string;
  sourceConnector: string;
  citationRelevanceScore?: number;
}

export interface AIFeedbackEvent {
  conversationId: string;
  messageId: string;
  feedbackType: "thumbs_up" | "thumbs_down" | "flag" | "copy" | "regenerate";
  feedbackReason?:
    | "inaccurate"
    | "unhelpful"
    | "offensive"
    | "outdated"
    | "other";
  feedbackText?: string;
}

export interface AIActionExecutedEvent {
  conversationId: string;
  messageId: string;
  actionType: string;
  actionTarget: string;
  success: boolean;
  errorCode?: string;
  executionTimeMs: number;
}

export const aiAssistantEvents = {
  conversationStarted: (event: AIConversationStartedEvent) => {
    getBrowserClient().capture("ai_conversation_started", {
      ...event,
      $set: {
        last_ai_conversation_at: new Date().toISOString(),
      },
    });
  },

  messageSent: (event: AIMessageSentEvent) => {
    getBrowserClient().capture("ai_message_sent", event);
  },

  responseReceived: (event: AIResponseReceivedEvent) => {
    getBrowserClient().capture("ai_response_received", event);
  },

  citationClicked: (event: AICitationClickedEvent) => {
    getBrowserClient().capture("ai_citation_clicked", event);
  },

  feedback: (event: AIFeedbackEvent) => {
    getBrowserClient().capture("ai_feedback_submitted", event);
  },

  actionExecuted: (event: AIActionExecutedEvent) => {
    getBrowserClient().capture("ai_action_executed", event);
  },
};

export const aiAssistantEventsServer = {
  conversationStarted: (
    distinctId: string,
    event: AIConversationStartedEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "ai_conversation_started",
      properties: event,
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  responseReceived: (
    distinctId: string,
    event: AIResponseReceivedEvent,
    teamId?: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "ai_response_received",
      properties: event,
      groups: teamId ? { team: teamId } : undefined,
    });
  },

  feedback: (distinctId: string, event: AIFeedbackEvent, teamId?: string) => {
    const client = getServerClient();
    client.capture({
      distinctId,
      event: "ai_feedback_submitted",
      properties: event,
      groups: teamId ? { team: teamId } : undefined,
    });
  },
};
