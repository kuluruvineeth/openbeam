export {
  type AutoQuestionParams,
  handleAppMention,
  handleAutoQuestion,
} from "./mention-handler";

export {
  analyzeQuestion,
  extractMentionedUserIds,
  shouldAutoRespond,
} from "./question-detector";

export {
  buildEphemeralPayload,
  buildResponseBlocks,
  buildSearchResultBlocks,
  buildSharedResponseBlocks,
  buildUnifiedSearchResultBlocks,
  type ResponseBlocksOptions,
} from "./response-builder";

export type {
  AssistantContext,
  AssistantHandlerResult,
  AssistantResponse,
  Citation,
  QuestionAnalysis,
  QuestionType,
  ReactionStatus,
  ResponseMode,
} from "./types";

export {
  AssistantResponseSchema,
  CitationSchema,
  QuestionAnalysisSchema,
  QuestionTypeSchema,
  REACTION_EMOJIS,
  ReactionStatusSchema,
  ResponseModeSchema,
} from "./types";
