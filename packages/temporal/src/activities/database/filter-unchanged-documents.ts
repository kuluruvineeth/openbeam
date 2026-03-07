import type { Database } from "@openbeam/db";
import { findIndexedDocumentsByExternalIds } from "@openbeam/db";
import { BloomFilter } from "@openbeam/services/lib/bloom-filter";
import type { GenericDocument } from "@openbeam/vespa";

export interface FilterUnchangedInput {
  documents: GenericDocument[];
  connectorId: string;
  useBloomFilter?: boolean;
}

export interface FilterUnchangedResult {
  changedDocuments: GenericDocument[];
  skipped: number;
  bloomFilterStats?: {
    falsePositives: number;
    trueNegatives: number;
  };
}

const checksumBloomFilters = new Map<string, BloomFilter>();

function getOrCreateBloomFilter(connectorId: string): BloomFilter {
  let filter = checksumBloomFilters.get(connectorId);
  if (!filter) {
    filter = new BloomFilter({
      size: BloomFilter.optimalSize(1_000_000, 0.01),
      falsePositiveRate: 0.01,
    });
    checksumBloomFilters.set(connectorId, filter);
  }
  return filter;
}

export function createFilterUnchangedDocumentsActivity(deps: { db: Database }) {
  return function filterUnchangedDocuments(
    input: FilterUnchangedInput
  ): Promise<FilterUnchangedResult> {
    if (input.documents.length === 0) {
      return Promise.resolve({ changedDocuments: [], skipped: 0 });
    }

    if (input.useBloomFilter ?? true) {
      return filterWithBloomFilter(input, deps);
    }

    return filterWithDatabase(input, deps);
  };
}

async function filterWithBloomFilter(
  input: FilterUnchangedInput,
  deps: { db: Database }
): Promise<FilterUnchangedResult> {
  const bloomFilter = getOrCreateBloomFilter(input.connectorId);
  const potentiallyNew: GenericDocument[] = [];
  const definitelyNew: GenericDocument[] = [];

  let skipped = 0;
  let falsePositives = 0;
  let trueNegatives = 0;

  for (const doc of input.documents) {
    const checksum = doc.checksum ?? "";
    const mightExist = await bloomFilter.has(checksum);

    if (mightExist) {
      potentiallyNew.push(doc);
    } else {
      definitelyNew.push(doc);
      await bloomFilter.add(checksum);
      trueNegatives += 1;
    }
  }

  if (potentiallyNew.length === 0) {
    return {
      changedDocuments: definitelyNew,
      skipped,
      bloomFilterStats: { falsePositives, trueNegatives },
    };
  }

  const externalIds = potentiallyNew.map((doc) => doc.external_id);
  const existingDocs = await findIndexedDocumentsByExternalIds(
    deps.db,
    input.connectorId,
    externalIds
  );

  const changedDocuments: GenericDocument[] = [...definitelyNew];

  for (const doc of potentiallyNew) {
    const existing = existingDocs.get(doc.external_id);
    const newChecksum = doc.checksum ?? "";

    if (!existing || existing.checksum !== newChecksum) {
      changedDocuments.push(doc);
      await bloomFilter.add(newChecksum);
      falsePositives += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    changedDocuments,
    skipped,
    bloomFilterStats: { falsePositives, trueNegatives },
  };
}

async function filterWithDatabase(
  input: FilterUnchangedInput,
  deps: { db: Database }
): Promise<FilterUnchangedResult> {
  const externalIds = input.documents.map((doc) => doc.external_id);
  const existingDocs = await findIndexedDocumentsByExternalIds(
    deps.db,
    input.connectorId,
    externalIds
  );

  const changedDocuments: GenericDocument[] = [];
  let skipped = 0;

  for (const doc of input.documents) {
    const existing = existingDocs.get(doc.external_id);
    const newChecksum = doc.checksum ?? "";

    if (!existing || existing.checksum !== newChecksum) {
      changedDocuments.push(doc);
    } else {
      skipped += 1;
    }
  }

  return { changedDocuments, skipped };
}
