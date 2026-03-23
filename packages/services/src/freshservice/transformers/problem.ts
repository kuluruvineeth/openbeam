import type { FreshserviceTransformContext } from "@openbeam/types/services/connectors/freshservice";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const PROBLEM_STATUS_MAP: Record<number, string> = {
  1: "Open",
  2: "Change Requested",
  3: "Closed",
};

const PROBLEM_PRIORITY_MAP: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Urgent",
};

const IMPACT_MAP: Record<number, string> = {
  1: "Low",
  2: "Medium",
  3: "High",
};

export interface FreshserviceProblem {
  id: number;
  subject: string;
  description_text?: string;
  status: number;
  priority: number;
  impact: number;
  agent_id?: number;
  group_id?: number;
  known_error?: boolean;
  created_at: string;
  updated_at: string;
  category?: string;
  sub_category?: string;
}

function buildProblemContent(problem: FreshserviceProblem): string {
  const parts: string[] = [];

  if (problem.description_text) {
    parts.push(problem.description_text);
  }

  parts.push(
    `Status: ${PROBLEM_STATUS_MAP[problem.status] ?? String(problem.status)}`
  );
  parts.push(
    `Priority: ${PROBLEM_PRIORITY_MAP[problem.priority] ?? String(problem.priority)}`
  );
  parts.push(`Impact: ${IMPACT_MAP[problem.impact] ?? String(problem.impact)}`);

  if (problem.known_error) {
    parts.push("Known Error: Yes");
  }

  if (problem.category) {
    parts.push(`Category: ${problem.category}`);
  }

  return parts.join("\n");
}

function buildProblemMetadata(
  problem: FreshserviceProblem
): GenericDocument["metadata"] {
  return {
    problemId: problem.id,
    status: PROBLEM_STATUS_MAP[problem.status] ?? String(problem.status),
    priority:
      PROBLEM_PRIORITY_MAP[problem.priority] ?? String(problem.priority),
    impact: IMPACT_MAP[problem.impact] ?? String(problem.impact),
    ...(problem.known_error !== undefined && {
      knownError: problem.known_error,
    }),
    ...(problem.category && { category: problem.category }),
    ...(problem.sub_category && { subCategory: problem.sub_category }),
  };
}

export async function transformProblem(
  problem: FreshserviceProblem,
  context: FreshserviceTransformContext
): Promise<GenericDocument> {
  const title = `[Problem #${problem.id}] ${problem.subject}`;
  const content = buildProblemContent(problem);
  const metadata = buildProblemMetadata(problem);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(problem.created_at).getTime();
  const updatedAt = new Date(problem.updated_at).getTime();

  return {
    id: `${context.connectorId}_problem_${problem.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(problem.id),
    document_type: "problem",
    document_subtype: PROBLEM_PRIORITY_MAP[problem.priority] ?? "unknown",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "freshservice",
    source_name: context.domain,
    url: `https://${context.domain}.freshservice.com/itil/problems/${problem.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
