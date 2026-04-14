import type { Database } from "@openbeam/db";
import { mergeEntities } from "@openbeam/services/knowledge/merge";
import {
  findMergeCandidates,
  type MergeCandidate,
} from "@openbeam/services/knowledge/resolution";

export interface EntityResolutionDependencies {
  db: Database;
}

export interface EntityResolutionInput {
  teamId: string;
  connectorId?: string;
  batchSize?: number;
}

export interface EntityResolutionOutput {
  candidatesFound: number;
  merged: number;
  skipped: number;
}

export function createEntityResolutionActivities(
  deps: EntityResolutionDependencies
) {
  return {
    findResolutionCandidates(
      input: EntityResolutionInput
    ): Promise<MergeCandidate[]> {
      return findMergeCandidates(deps.db, input.teamId, input.batchSize ?? 50);
    },

    async executeMergeBatch(
      candidates: MergeCandidate[]
    ): Promise<EntityResolutionOutput> {
      let merged = 0;
      let skipped = 0;

      for (const candidate of candidates) {
        if (candidate.confidence < 0.95) {
          skipped += 1;
          continue;
        }

        try {
          await mergeEntities(
            deps.db,
            candidate.primaryId,
            candidate.secondaryId
          );
          merged += 1;
        } catch {
          skipped += 1;
        }
      }

      return {
        candidatesFound: candidates.length,
        merged,
        skipped,
      };
    },
  };
}
