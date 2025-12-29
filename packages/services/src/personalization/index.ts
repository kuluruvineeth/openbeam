export { resolveColdStartProfile } from "./cold-start";
export { updateDocEmbedding, updateQueryEmbedding } from "./embeddings";
export { resolveUserProfile, serializeEmbedding } from "./resolver";
export { computePersonalizationScores } from "./scoring";
export {
  applyPersonalization,
  type PersonalizedDocument,
  shouldPersonalize,
} from "./search-integration";
export { computeTopicAffinity, updateTopicAffinity } from "./topic-affinity";
export type {
  DocumentForScoring,
  PersonalizationContext,
  PersonalizationScores,
  RecentClick,
  RecentQuery,
  ResolvedUserProfile,
} from "./types";
