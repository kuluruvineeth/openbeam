import type { DocumentChange } from "@openbeam/db";

export interface FetchUnprocessedChangesInput {
  teamId: string;
  connectorId: string;
  syncHistoryId?: string;
  limit?: number;
}

export interface ExtractEntitiesFromChangesInput {
  teamId: string;
  documentIds: string[];
}

export interface EntityMention {
  entityId: string;
  entityName: string;
  entityType: string;
  documentId: string;
  confidence: number;
}

export interface ExtractEntitiesFromChangesOutput {
  entitiesUpdated: number;
  mentions: EntityMention[];
}

export interface UpdateCoOccurrenceEdgesInput {
  teamId: string;
  entityMentions: EntityMention[];
}

export interface UpdateCoOccurrenceEdgesOutput {
  edgesUpdated: number;
  edgesCreated: number;
}

export interface MarkChangesProcessedInput {
  changeIds: string[];
}

export interface CountUnprocessedChangesInput {
  teamId: string;
  connectorId: string;
  syncHistoryId?: string;
}

export interface InvalidateEdgesInput {
  teamId: string;
  documentId: string;
}

export interface InvalidateEdgesOutput {
  edgesInvalidated: number;
  mentionsRemoved: number;
}

export interface LinkPersonIdentitiesInput {
  teamId: string;
}

export interface LinkPersonIdentitiesOutput {
  merged: number;
}

export interface KnowledgeChangeActivities {
  fetchUnprocessedChanges(
    input: FetchUnprocessedChangesInput
  ): Promise<DocumentChange[]>;
  extractEntitiesFromChanges(
    input: ExtractEntitiesFromChangesInput
  ): Promise<ExtractEntitiesFromChangesOutput>;
  updateCoOccurrenceEdges(
    input: UpdateCoOccurrenceEdgesInput
  ): Promise<UpdateCoOccurrenceEdgesOutput>;
  linkPersonIdentities(
    input: LinkPersonIdentitiesInput
  ): Promise<LinkPersonIdentitiesOutput>;
  markChangesProcessed(input: MarkChangesProcessedInput): Promise<void>;
  countUnprocessedChanges(input: CountUnprocessedChangesInput): Promise<number>;
  invalidateEdges(input: InvalidateEdgesInput): Promise<InvalidateEdgesOutput>;
}

export interface CleanupKnowledgeChangesInput {
  documentChangeRetentionDays?: number;
  entityChangeRetentionDays?: number;
  activityEventRetentionDays?: number;
}

export interface CleanupKnowledgeChangesOutput {
  documentChangesDeleted: number;
  entityChangesDeleted: number;
  activityEventsDeleted: number;
}

export interface KnowledgeCleanupActivities {
  cleanupKnowledgeChanges(
    input: CleanupKnowledgeChangesInput
  ): Promise<CleanupKnowledgeChangesOutput>;
}
