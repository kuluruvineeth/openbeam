import type { GenericDocument, VespaClient } from "@openbeam/vespa";

export interface UpsertDocumentDependencies {
  vespa: VespaClient;
}

function isGenericDocument(value: unknown): value is GenericDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const doc = value as Record<string, unknown>;
  return typeof doc.id === "string" && typeof doc.connector_id === "string";
}

export function createUpsertDocumentActivity(deps: UpsertDocumentDependencies) {
  const { vespa } = deps;

  return async function upsertDocument(input: {
    connectorId: string;
    document: unknown;
  }): Promise<void> {
    if (!isGenericDocument(input.document)) {
      throw new Error("Invalid document format");
    }

    const documentWithIndexedAt = {
      ...input.document,
      indexed_at: Date.now(),
    };

    await vespa.feedBatch([documentWithIndexedAt]);
  };
}
