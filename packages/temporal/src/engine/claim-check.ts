import type { Database } from "@openplane/db";
import {
  createAgentCanvasExecutionData,
  findAgentCanvasExecutionData,
} from "@openplane/db";
import {
  type ClaimCheckMetadata,
  type ClaimCheckOptions,
  type ClaimCheckStore,
  type ClaimCheckValue,
  estimatePayloadSize,
  isExecutionDataRef,
} from "./claim-check-utils";

export {
  type ClaimCheckMetadata,
  type ClaimCheckOptions,
  type ClaimCheckStore,
  type ClaimCheckValue,
  estimatePayloadSize,
  isExecutionDataRef,
} from "./claim-check-utils";

const DEFAULT_MAX_INLINE_BYTES = 16_384;

export function storePayload(
  value: unknown,
  store: ClaimCheckStore,
  options: ClaimCheckOptions = {},
  metadata: ClaimCheckMetadata = {}
): Promise<ClaimCheckValue> {
  const maxInlineBytes = options.maxInlineBytes ?? DEFAULT_MAX_INLINE_BYTES;
  const sizeBytes = estimatePayloadSize(value);

  if (sizeBytes <= maxInlineBytes) {
    return Promise.resolve(value);
  }

  return store.put(value, { ...metadata, sizeBytes });
}

export function resolvePayload(
  value: ClaimCheckValue,
  store: ClaimCheckStore
): Promise<unknown> {
  if (!isExecutionDataRef(value)) {
    return Promise.resolve(value);
  }

  return store.get(value);
}

export function createDbClaimCheckStore(
  db: Database,
  executionId: string,
  teamId: string
): ClaimCheckStore {
  return {
    async put(payload, metadata = {}) {
      const record = await createAgentCanvasExecutionData(db, teamId, {
        executionId,
        nodeId: metadata.nodeId,
        contentType: metadata.contentType,
        payload,
        sizeBytes: metadata.sizeBytes ?? estimatePayloadSize(payload),
      });

      return {
        id: record.id,
        storage: "db",
        sizeBytes: record.sizeBytes ?? undefined,
        contentType: record.contentType ?? undefined,
      };
    },
    async get(ref) {
      const record = await findAgentCanvasExecutionData(
        db,
        executionId,
        ref.id
      );

      if (!record) {
        throw new Error("Execution data not found");
      }

      return record.payload;
    },
  };
}
