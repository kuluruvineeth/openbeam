import { getBrowserClient } from "../clients/browser";
import { getServerClient } from "../clients/server";

export interface DocumentViewedEvent {
  documentId: string;
  documentType: string;
  connectorType: string;
  source:
    | "search"
    | "ai_citation"
    | "direct_link"
    | "recent"
    | "bookmark"
    | "collection";
  queryId?: string;
  previewType: "modal" | "sidebar" | "full_page" | "inline";
}

export interface DocumentActionEvent {
  documentId: string;
  documentType: string;
  action:
    | "bookmark"
    | "unbookmark"
    | "share"
    | "copy_link"
    | "download"
    | "open_in_source"
    | "add_to_collection";
  collectionId?: string;
}

export interface DocumentFeedbackEvent {
  documentId: string;
  documentType: string;
  feedbackType:
    | "relevant"
    | "not_relevant"
    | "outdated"
    | "incorrect"
    | "missing_info";
  feedbackText?: string;
  queryId?: string;
}

export interface DocumentInteractionEvent {
  documentId: string;
  documentType: string;
  interactionType:
    | "scroll"
    | "copy_text"
    | "click_link"
    | "highlight"
    | "expand_section";
  interactionData?: Record<string, unknown>;
}

export const documentEvents = {
  viewed: (event: DocumentViewedEvent) => {
    getBrowserClient().capture("document_viewed", event);
  },

  action: (event: DocumentActionEvent) => {
    getBrowserClient().capture("document_action", event);
  },

  feedback: (event: DocumentFeedbackEvent) => {
    getBrowserClient().capture("document_feedback", event);
  },

  interaction: (event: DocumentInteractionEvent) => {
    getBrowserClient().capture("document_interaction", event);
  },
};

export const documentEventsServer = {
  indexed: (
    documentId: string,
    documentType: string,
    connectorId: string,
    teamId: string
  ) => {
    const client = getServerClient();
    client.capture({
      distinctId: `connector:${connectorId}`,
      event: "document_indexed",
      properties: {
        document_id: documentId,
        document_type: documentType,
        connector_id: connectorId,
      },
      groups: { team: teamId },
    });
  },

  deleted: (options: {
    documentId: string;
    documentType: string;
    connectorId: string;
    teamId: string;
    reason: "sync" | "connector_removed" | "manual" | "policy";
  }) => {
    const client = getServerClient();
    client.capture({
      distinctId: `connector:${options.connectorId}`,
      event: "document_deleted",
      properties: {
        document_id: options.documentId,
        document_type: options.documentType,
        connector_id: options.connectorId,
        reason: options.reason,
      },
      groups: { team: options.teamId },
    });
  },
};
