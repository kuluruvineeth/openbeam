import type {
  ProcessWebhookEventInput,
  ProcessWebhookEventOutput,
} from "./types";

function isPayloadObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractDocumentIds(payload: unknown): string[] {
  if (!isPayloadObject(payload)) {
    return [];
  }
  if (Array.isArray(payload.documentIds)) {
    return payload.documentIds.filter(
      (id): id is string => typeof id === "string"
    );
  }

  if (typeof payload.documentId === "string") {
    return [payload.documentId];
  }

  if (typeof payload.id === "string") {
    return [payload.id];
  }

  if (Array.isArray(payload.ids)) {
    return payload.ids.filter((id): id is string => typeof id === "string");
  }

  return [];
}

export function createProcessWebhookEventActivity() {
  return function processWebhookEvent(
    input: ProcessWebhookEventInput
  ): Promise<ProcessWebhookEventOutput> {
    const eventTypeLower = input.eventType.toLowerCase();

    if (
      eventTypeLower.includes("revoke") ||
      eventTypeLower.includes("uninstall") ||
      eventTypeLower.includes("auth.revoked") ||
      eventTypeLower.includes("tokens_revoked")
    ) {
      return Promise.resolve({ action: "revoke_auth", documentIds: [] });
    }

    if (eventTypeLower.includes("delete")) {
      const documentIds = extractDocumentIds(input.payload);
      return Promise.resolve({ action: "delete_document", documentIds });
    }

    if (
      eventTypeLower.includes("create") ||
      eventTypeLower.includes("update")
    ) {
      const documentIds = extractDocumentIds(input.payload);
      return Promise.resolve({ action: "sync_document", documentIds });
    }

    return Promise.resolve({ action: "ignore", documentIds: [] });
  };
}
