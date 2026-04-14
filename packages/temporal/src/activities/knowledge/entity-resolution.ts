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
  needsReview: number;
  failed: number;
}

function isPrismaNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2025"
  );
}

export function createEntityResolutionActivities(
  deps: EntityResolutionDependencies
) {
  return {
    findResolutionCandidates(
      input: EntityResolutionInput
    ): Promise<MergeCandidate[]> {
      const limit = Math.min(input.batchSize ?? 50, 100);
      return findMergeCandidates(deps.db, input.teamId, limit);
    },

    async executeMergeBatch(
      candidates: MergeCandidate[]
    ): Promise<EntityResolutionOutput> {
      let merged = 0;
      let needsReview = 0;
      let failed = 0;

      for (const candidate of candidates) {
        if (candidate.confidence < 0.95) {
          needsReview += 1;
          continue;
        }

        const secondary = await deps.db.entity.findUnique({
          where: { id: candidate.secondaryId },
          select: { id: true },
        });
        if (!secondary) {
          continue;
        }

        try {
          await mergeEntities(
            deps.db,
            candidate.primaryId,
            candidate.secondaryId
          );
          merged += 1;
        } catch (error) {
          if (isPrismaNotFound(error)) {
            continue;
          }
          failed += 1;
          throw error;
        }
      }

      return {
        candidatesFound: candidates.length,
        merged,
        needsReview,
        failed,
      };
    },
  };
}
