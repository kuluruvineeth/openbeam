import type { Database } from "@openplane/db";
import type {
  AggregateMentionsInput,
  AggregateMentionsOutput,
  ComputeExpertiseInput,
  ComputeExpertiseOutput,
  DecayScoresInput,
  DecayScoresOutput,
  DetectPatternsInput,
  DetectPatternsOutput,
  InferRelationshipsInput,
  InferRelationshipsOutput,
  PersistInferenceInput,
  PersistInferenceOutput,
} from "@openplane/types/temporal/activities/knowledge";
import type { VespaClient } from "@openplane/vespa";
import { createAggregateMentionsActivity } from "./aggregate-mentions";
import { createCleanupKnowledgeChangesActivity } from "./cleanup";
import { createComputeExpertiseActivity } from "./compute-expertise";
import { createCountUnprocessedChangesActivity } from "./count-unprocessed-changes";
import { createDecayScoresActivity } from "./decay-scores";
import { createDetectPatternsActivity } from "./detect-patterns";
import { createExtractEntitiesFromChangesActivity } from "./extract-entities-from-changes";
import { createFetchUnprocessedChangesActivity } from "./fetch-unprocessed-changes";
import { createInferRelationshipsActivity } from "./infer-relationships";
import { createInvalidateEdgesActivity } from "./invalidate-edges";
import { createLinkPersonIdentitiesActivity } from "./link-person-identities";
import { createMarkChangesProcessedActivity } from "./mark-changes-processed";
import { createPersistInferenceActivity } from "./persist-inference";
import type {
  KnowledgeChangeActivities,
  KnowledgeCleanupActivities,
} from "./types";
import { createUpdateCoOccurrenceEdgesActivity } from "./update-co-occurrence-edges";

export interface KnowledgeInferenceActivities {
  aggregateMentions: (
    input: AggregateMentionsInput
  ) => Promise<AggregateMentionsOutput>;
  computeExpertiseScores: (
    input: ComputeExpertiseInput
  ) => Promise<ComputeExpertiseOutput>;
  inferRelationships: (
    input: InferRelationshipsInput
  ) => Promise<InferRelationshipsOutput>;
  detectPatterns: (input: DetectPatternsInput) => Promise<DetectPatternsOutput>;
  decayScores: (input: DecayScoresInput) => Promise<DecayScoresOutput>;
  persistInferenceResults: (
    input: PersistInferenceInput
  ) => Promise<PersistInferenceOutput>;
}

export interface KnowledgeActivityDependencies {
  db: Database;
}

export interface KnowledgeChangeActivityDependencies {
  db: Database;
  engineBaseUrl: string;
  vespa: VespaClient;
}

export function createKnowledgeInferenceActivities(
  deps: KnowledgeActivityDependencies
): KnowledgeInferenceActivities {
  return {
    aggregateMentions: createAggregateMentionsActivity({ db: deps.db }),
    computeExpertiseScores: createComputeExpertiseActivity({ db: deps.db }),
    inferRelationships: createInferRelationshipsActivity({ db: deps.db }),
    detectPatterns: createDetectPatternsActivity({ db: deps.db }),
    decayScores: createDecayScoresActivity({ db: deps.db }),
    persistInferenceResults: createPersistInferenceActivity({ db: deps.db }),
  };
}

export function createKnowledgeChangeActivities(
  deps: KnowledgeChangeActivityDependencies
): KnowledgeChangeActivities {
  return {
    fetchUnprocessedChanges: createFetchUnprocessedChangesActivity({
      db: deps.db,
    }),
    extractEntitiesFromChanges: createExtractEntitiesFromChangesActivity({
      db: deps.db,
      vespa: deps.vespa,
      engineBaseUrl: deps.engineBaseUrl,
    }),
    updateCoOccurrenceEdges: createUpdateCoOccurrenceEdgesActivity({
      db: deps.db,
    }),
    markChangesProcessed: createMarkChangesProcessedActivity({
      db: deps.db,
    }),
    countUnprocessedChanges: createCountUnprocessedChangesActivity({
      db: deps.db,
    }),
    invalidateEdges: createInvalidateEdgesActivity({ db: deps.db }),
    linkPersonIdentities: createLinkPersonIdentitiesActivity({ db: deps.db }),
  };
}

export function createKnowledgeCleanupActivities(
  deps: Pick<KnowledgeActivityDependencies, "db">
): KnowledgeCleanupActivities {
  return {
    cleanupKnowledgeChanges: createCleanupKnowledgeChangesActivity({
      db: deps.db,
    }),
  };
}

export {
  type AggregateMentionsDependencies,
  createAggregateMentionsActivity,
} from "./aggregate-mentions";
export {
  type CleanupKnowledgeChangesDependencies,
  createCleanupKnowledgeChangesActivity,
} from "./cleanup";
export {
  type ComputeExpertiseDependencies,
  createComputeExpertiseActivity,
} from "./compute-expertise";
export {
  type CountUnprocessedChangesDependencies,
  createCountUnprocessedChangesActivity,
} from "./count-unprocessed-changes";
export {
  createDecayScoresActivity,
  type DecayScoresDependencies,
} from "./decay-scores";
export {
  createDetectPatternsActivity,
  type DetectPatternsDependencies,
} from "./detect-patterns";
export {
  createExtractEntitiesFromChangesActivity,
  type ExtractEntitiesDependencies,
} from "./extract-entities-from-changes";
export {
  createFetchUnprocessedChangesActivity,
  type FetchUnprocessedChangesDependencies,
} from "./fetch-unprocessed-changes";
export {
  createInferRelationshipsActivity,
  type InferRelationshipsDependencies,
} from "./infer-relationships";
export {
  createInvalidateEdgesActivity,
  type InvalidateEdgesDependencies,
} from "./invalidate-edges";
export {
  createLinkPersonIdentitiesActivity,
  type LinkPersonIdentitiesDependencies,
} from "./link-person-identities";
export {
  createMarkChangesProcessedActivity,
  type MarkChangesProcessedDependencies,
} from "./mark-changes-processed";
export {
  createPersistInferenceActivity,
  type PersistInferenceDependencies,
} from "./persist-inference";
export type {
  CleanupKnowledgeChangesInput,
  CleanupKnowledgeChangesOutput,
  CountUnprocessedChangesInput,
  EntityMention,
  ExtractEntitiesFromChangesInput,
  ExtractEntitiesFromChangesOutput,
  FetchUnprocessedChangesInput,
  InvalidateEdgesInput,
  InvalidateEdgesOutput,
  KnowledgeChangeActivities,
  KnowledgeCleanupActivities,
  LinkPersonIdentitiesInput,
  LinkPersonIdentitiesOutput,
  MarkChangesProcessedInput,
  UpdateCoOccurrenceEdgesInput,
  UpdateCoOccurrenceEdgesOutput,
} from "./types";
export {
  createUpdateCoOccurrenceEdgesActivity,
  type UpdateCoOccurrenceEdgesDependencies,
} from "./update-co-occurrence-edges";
