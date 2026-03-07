export type { RecentClick, RecentQuery } from "@openbeam/db";

export interface PersonalizationContext {
  userId: string;
  teamId: string;
  email: string | null;
  sessionId?: string;
}

export interface ResolvedUserProfile {
  userId: string;
  teamId: string;
  department: string | null;

  searchCount: number;
  clickCount: number;
  avgDwellMs: number | null;

  connectorWeights: Record<string, number>;
  authorInteractions: Record<string, number>;
  topicWeights: Record<string, number>;

  queryEmbedding: number[] | null;
  docEmbedding: number[] | null;

  isNewUser: boolean;
  personalizationEnabled: boolean;
  resolvedAt: number;
  source: "cache" | "database" | "defaults";
}

export interface PersonalizationScores {
  docId: string;
  connectorBoost: number;
  authorBoost: number;
  topicBoost: number;
  embeddingBoost: number;
  recencyBoost: number;
  totalBoost: number;
}

export interface DocumentForScoring {
  docId: string;
  connectorType: string;
  authorId: string | null;
  topicIds: string[];
  embedding: number[] | null;
  createdAt: Date;
  updatedAt: Date;
}
