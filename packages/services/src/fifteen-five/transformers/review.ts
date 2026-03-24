import type { FifteenFiveTransformContext } from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FifteenFiveReview } from "../api/reviews";
import type { FifteenFiveUser } from "../api/users";
import { buildFifteenFiveUrl, getUserEmail, getUserName } from "./utils";

function buildReviewContent(
  review: FifteenFiveReview,
  userLookup: Map<number, FifteenFiveUser>
): string {
  const parts: string[] = [];

  const reviewerName = getUserName(review.reviewer, userLookup);
  const revieweeName = getUserName(review.reviewee, userLookup);

  if (reviewerName) {
    parts.push(`Reviewer: ${reviewerName}`);
  }

  if (revieweeName) {
    parts.push(`Reviewee: ${revieweeName}`);
  }

  if (review.review_cycle_name) {
    parts.push(`Cycle: ${review.review_cycle_name}`);
  }

  if (review.status) {
    parts.push(`Status: ${review.status}`);
  }

  if (review.submitted_date) {
    parts.push(`Submitted: ${review.submitted_date}`);
  }

  return parts.join("\n");
}

export async function transformReview(
  review: FifteenFiveReview,
  context: FifteenFiveTransformContext,
  userLookup: Map<number, FifteenFiveUser>
): Promise<GenericDocument> {
  const reviewerName = getUserName(review.reviewer, userLookup);
  const revieweeName = getUserName(review.reviewee, userLookup);
  const cyclePart = review.review_cycle_name
    ? ` (${review.review_cycle_name})`
    : "";
  const title = `Review: ${reviewerName ?? `User ${review.reviewer}`} → ${revieweeName ?? `User ${review.reviewee}`}${cyclePart}`;
  const content = buildReviewContent(review, userLookup);
  const metadata: GenericDocument["metadata"] = {
    reviewerId: String(review.reviewer),
    revieweeId: String(review.reviewee),
    isSubmitted: review.is_submitted,
    ...(review.status && { status: review.status }),
    ...(review.review_cycle_name && { cycleName: review.review_cycle_name }),
    ...(review.review_cycle !== null && {
      cycleId: String(review.review_cycle),
    }),
    ...(reviewerName && { reviewerName }),
    ...(revieweeName && { revieweeName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_review_${review.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(review.id),
    document_type: "review",
    document_subtype: review.is_submitted ? "submitted" : "pending",
    title,
    content,
    created_at: new Date(review.created).getTime(),
    updated_at: new Date(review.modified).getTime(),
    source_type: "fifteen-five",
    url: buildFifteenFiveUrl(`/reviews/${review.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: reviewerName,
    author_email: getUserEmail(review.reviewer, userLookup),
  };
}
