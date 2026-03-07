import type {
  FhirSyncBatch,
  FhirSyncCursor,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";

export function createSyncBatch(
  items: GenericDocument[],
  cursor: FhirSyncCursor,
  hasMore: boolean,
  stats: { processed: number; skipped: number; errors: number }
): FhirSyncBatch<GenericDocument> {
  return {
    items,
    cursor: { ...cursor },
    hasMore,
    stats,
  };
}
