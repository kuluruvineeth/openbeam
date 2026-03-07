import {
  ProfileUpdateInputSchema,
  type ProfileUpdateOutput,
} from "@openbeam/types/temporal/workflows";
import { proxyActivities } from "@temporalio/workflow";
import type { ProfileUpdateActivities } from "../../activities/personalization/types";

const profileActivities = proxyActivities<ProfileUpdateActivities>({
  startToCloseTimeout: "30 seconds",
  scheduleToCloseTimeout: "2 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
  },
});

export type ProfileUpdateEventType = "search" | "click" | "feedback";

export interface ProfileUpdateWorkflowInput {
  userId: string;
  teamId: string;
  eventType: ProfileUpdateEventType;
  payload: SearchPayload | ClickPayload | FeedbackPayload;
}

export interface SearchPayload {
  query: string;
  queryEmbedding: number[];
}

export interface ClickPayload {
  docId: string;
  connectorType: string;
  docEmbedding: number[];
  authorId: string | null;
  topicIds: string[];
  dwellMs: number;
  position: number;
}

export interface FeedbackPayload {
  docId: string;
  feedbackType: "helpful" | "not_helpful";
}

export interface ProfileUpdateWorkflowOutput {
  success: boolean;
  eventType: ProfileUpdateEventType;
  details?: Record<string, unknown>;
}

export async function profileUpdateWorkflow(
  rawInput: unknown
): Promise<ProfileUpdateOutput> {
  const input = ProfileUpdateInputSchema.parse(rawInput);
  const { userId, teamId, eventType, payload } = input;

  try {
    switch (eventType) {
      case "search": {
        const searchPayload = payload as SearchPayload;
        await profileActivities.handleSearchEvent({
          userId,
          teamId,
          event: {
            query: searchPayload.query,
            queryEmbedding: searchPayload.queryEmbedding,
          },
        });
        break;
      }

      case "click": {
        const clickPayload = payload as ClickPayload;
        await profileActivities.handleClickEvent({
          userId,
          teamId,
          event: {
            docId: clickPayload.docId,
            connectorType: clickPayload.connectorType,
            docEmbedding: clickPayload.docEmbedding,
            authorId: clickPayload.authorId,
            topicIds: clickPayload.topicIds,
            dwellMs: clickPayload.dwellMs,
            position: clickPayload.position,
          },
        });
        break;
      }

      case "feedback": {
        const feedbackPayload = payload as FeedbackPayload;
        const result = await profileActivities.handleFeedbackEvent({
          userId,
          teamId,
          event: {
            docId: feedbackPayload.docId,
            feedbackType: feedbackPayload.feedbackType,
          },
        });

        await profileActivities.invalidateProfileCache({ teamId, userId });

        return {
          success: true,
          eventType,
          details: {
            connectorType: result.connectorType,
            newWeight: result.newWeight,
          },
        };
      }

      default:
        throw new Error(`Unknown event type: ${String(eventType)}`);
    }

    await profileActivities.invalidateProfileCache({ teamId, userId });

    return { success: true, eventType };
  } catch (error) {
    await profileActivities.invalidateProfileCache({ teamId, userId });

    throw error;
  }
}
