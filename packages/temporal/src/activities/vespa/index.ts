import type { VespaClient } from "@openplane/vespa";
import { createBulkIndexActivity } from "./bulk-index";
import { createDeduplicateActivity } from "./deduplicate";
import { createDeleteByConnectorActivity } from "./delete-by-connector";
import { createDeleteDocumentsActivity } from "./delete-documents";
import { createRemoveOrphanChunksActivity } from "./remove-orphan-chunks";
import { createSearchActivity } from "./search";
import type { VespaActivities } from "./types";

export interface VespaActivityDependencies {
  vespa: VespaClient;
}

export function createVespaActivities(
  deps: VespaActivityDependencies
): VespaActivities {
  const { vespa } = deps;

  const deleteDocuments = createDeleteDocumentsActivity(vespa);

  return {
    bulkIndex: createBulkIndexActivity(vespa),
    deleteDocuments,
    deleteByConnector: createDeleteByConnectorActivity(vespa),
    deduplicateByChecksum: createDeduplicateActivity(),
    search: createSearchActivity(vespa),
    removeOrphanChunks: createRemoveOrphanChunksActivity(
      vespa,
      deleteDocuments
    ),
  };
}

export type {
  BulkIndexInput,
  BulkIndexResult,
  DeduplicateInput,
  DeleteByConnectorInput,
  DeleteDocumentsInput,
  SearchInput,
  SearchResult,
  VespaActivities,
} from "./types";
