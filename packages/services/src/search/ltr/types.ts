export interface DocumentFeatures {
  docId: string;
  bm25Title: number;
  bm25Content: number;
  denseScore: number;
  sparseScore: number;
  rerankScore: number;
  recencyDays: number;
  docLength: number;
  titleLength: number;
  viewCount: number;
  reactionCount: number;
  replyCount: number;
  trendingScore: number;
  authorityScore: number;
  titleExactMatch: boolean;
  titlePartialMatch: boolean;
  connectorType: string;
  documentType: string;
  departmentMatch: boolean;
  authorInteractionCount: number;
  authorId?: string;
  userQuerySimilarity?: number;
  userDocSimilarity?: number;
  connectorPreference?: number;
  authorAffinity?: number;
  topicAffinity?: number;
  isFromPreferredConnector?: boolean;
  isFromKnownAuthor?: boolean;
}

export interface UserContext {
  userId: string;
  teamId: string;
  department?: string;
  searchCount: number;
  clickCount: number;
  avgDwellMs?: number;
  connectorWeights: Record<string, number>;
  authorInteractions: Record<string, number>;
  topicWeights?: Record<string, number>;
  queryEmbedding?: number[] | null;
  docEmbedding?: number[] | null;
  isNewUser?: boolean;
}

export interface LTRRequest {
  query: string;
  documents: DocumentFeatures[];
  userContext?: UserContext;
  topK?: number;
  modelVersion?: string;
}

export interface LTRResult {
  docId: string;
  score: number;
  features: Record<string, number>;
}

export interface LTRResponse {
  results: LTRResult[];
  elapsedMs: number;
  modelVersion: string;
  featureCount: number;
}

export interface LTRHealth {
  ready: boolean;
  modelVersion: string;
  featureCount: number;
}
