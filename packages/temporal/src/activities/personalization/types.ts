export interface SearchEventData {
  query: string;
  queryEmbedding: number[];
}

export interface ClickEventData {
  docId: string;
  connectorType: string;
  docEmbedding: number[];
  authorId: string | null;
  topicIds: string[];
  dwellMs: number;
  position: number;
}

export interface FeedbackEventData {
  docId: string;
  feedbackType: "helpful" | "not_helpful";
}

export interface HandleSearchEventInput {
  userId: string;
  teamId: string;
  event: SearchEventData;
}

export interface HandleSearchEventOutput {
  success: boolean;
}

export interface HandleClickEventInput {
  userId: string;
  teamId: string;
  event: ClickEventData;
}

export interface HandleClickEventOutput {
  success: boolean;
}

export interface HandleFeedbackEventInput {
  userId: string;
  teamId: string;
  event: FeedbackEventData;
}

export interface HandleFeedbackEventOutput {
  success: boolean;
  connectorType: string | null;
  newWeight: number | null;
}

export interface InvalidateProfileCacheInput {
  teamId: string;
  userId: string;
}

export interface InvalidateProfileCacheOutput {
  success: boolean;
}

export interface ProfileUpdateActivities {
  handleSearchEvent(
    input: HandleSearchEventInput
  ): Promise<HandleSearchEventOutput>;
  handleClickEvent(
    input: HandleClickEventInput
  ): Promise<HandleClickEventOutput>;
  handleFeedbackEvent(
    input: HandleFeedbackEventInput
  ): Promise<HandleFeedbackEventOutput>;
  invalidateProfileCache(
    input: InvalidateProfileCacheInput
  ): Promise<InvalidateProfileCacheOutput>;
}
