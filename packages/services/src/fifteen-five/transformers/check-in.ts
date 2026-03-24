import type { FifteenFiveTransformContext } from "@openbeam/types/services/connectors/fifteen-five";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FifteenFiveCheckIn } from "../api/check-ins";
import type { FifteenFiveUser } from "../api/users";
import {
  buildFifteenFiveUrl,
  getUserEmail,
  getUserName,
  stripHtml,
} from "./utils";

function buildCheckInContent(
  checkIn: FifteenFiveCheckIn,
  userLookup: Map<number, FifteenFiveUser>
): string {
  const parts: string[] = [];
  const userName = getUserName(checkIn.user, userLookup);

  if (userName) {
    parts.push(`Author: ${userName}`);
  }

  if (checkIn.pulse_score !== null) {
    parts.push(`Pulse Score: ${checkIn.pulse_score}/5`);
  }

  parts.push(`Report Date: ${checkIn.report_date}`);

  for (const question of checkIn.questions) {
    parts.push(`Q: ${question.text}`);
    if (question.answer_text) {
      parts.push(`A: ${stripHtml(question.answer_text)}`);
    }
  }

  return parts.join("\n");
}

export async function transformCheckIn(
  checkIn: FifteenFiveCheckIn,
  context: FifteenFiveTransformContext,
  userLookup: Map<number, FifteenFiveUser>
): Promise<GenericDocument> {
  const userName = getUserName(checkIn.user, userLookup);
  const title = `Check-in: ${userName ?? `User ${checkIn.user}`} - ${checkIn.report_date}`;
  const content = buildCheckInContent(checkIn, userLookup);
  const metadata: GenericDocument["metadata"] = {
    reportDate: checkIn.report_date,
    isSubmitted: checkIn.is_submitted,
    questionCount: String(checkIn.questions.length),
    userId: String(checkIn.user),
    ...(checkIn.pulse_score !== null && {
      pulseScore: String(checkIn.pulse_score),
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_checkin_${checkIn.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(checkIn.id),
    document_type: "checkin",
    document_subtype: checkIn.is_submitted ? "submitted" : "draft",
    title,
    content,
    created_at: new Date(checkIn.created).getTime(),
    updated_at: new Date(checkIn.modified).getTime(),
    source_type: "fifteen-five",
    url: buildFifteenFiveUrl(`/check-in/${checkIn.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: userName,
    author_email: getUserEmail(checkIn.user, userLookup),
  };
}
