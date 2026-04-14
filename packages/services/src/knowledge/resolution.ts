import type { Database } from "@openbeam/db";
import {
  getEntitiesWithoutIdentities,
  getIdentityByEmail,
  getIdentityByExternalId,
} from "@openbeam/db";
import { resolveEntity } from "./identity";

export interface ResolutionMatch {
  entityId: string;
  confidence: number;
  matchStage: "email" | "external_id" | "name" | "alias";
}

export interface IdentitySignal {
  connectorType: string;
  externalId: string;
  email?: string;
  displayName?: string;
}

export async function resolveIdentity(
  db: Database,
  teamId: string,
  signal: IdentitySignal
): Promise<ResolutionMatch | null> {
  if (signal.email) {
    const emailMatch = await getIdentityByEmail(db, teamId, signal.email);
    if (emailMatch) {
      return {
        entityId: emailMatch.entityId,
        confidence: 1.0,
        matchStage: "email",
      };
    }
  }

  const externalMatch = await getIdentityByExternalId(
    db,
    teamId,
    signal.connectorType,
    signal.externalId
  );
  if (externalMatch) {
    return {
      entityId: externalMatch.entityId,
      confidence: 1.0,
      matchStage: "external_id",
    };
  }

  if (signal.displayName) {
    const nameMatch = await resolveEntity(db, signal.displayName, {
      teamId,
      entityType: "PERSON",
    });
    if (nameMatch && nameMatch.confidence >= 0.85) {
      return {
        entityId: nameMatch.entity.id,
        confidence: nameMatch.confidence,
        matchStage: nameMatch.matchType === "alias" ? "alias" : "name",
      };
    }
  }

  return null;
}

export interface MergeCandidate {
  primaryId: string;
  secondaryId: string;
  confidence: number;
  matchStage: string;
}

export async function findMergeCandidates(
  db: Database,
  teamId: string,
  limit = 50
): Promise<MergeCandidate[]> {
  const unresolved = await getEntitiesWithoutIdentities(db, teamId, limit);
  const candidates: MergeCandidate[] = [];

  for (const entity of unresolved) {
    const aliases = [entity.normalizedName, ...entity.aliases];

    for (const alias of aliases) {
      if (!alias) {
        continue;
      }

      const match = await resolveEntity(db, alias, {
        teamId,
        entityType: "PERSON",
      });

      if (match && match.entity.id !== entity.id && match.confidence >= 0.85) {
        const primary =
          match.entity.mentionCount >= entity.mentionCount
            ? match.entity
            : entity;
        const secondary =
          primary.id === match.entity.id ? entity : match.entity;

        const alreadyExists = candidates.some(
          (c) =>
            (c.primaryId === primary.id && c.secondaryId === secondary.id) ||
            (c.primaryId === secondary.id && c.secondaryId === primary.id)
        );

        if (!alreadyExists) {
          candidates.push({
            primaryId: primary.id,
            secondaryId: secondary.id,
            confidence: match.confidence,
            matchStage: match.matchType,
          });
        }
        break;
      }
    }
  }

  return candidates;
}
