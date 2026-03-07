import {
  assignControlIssueLabel,
  checkoutControlIssue,
  countControlIssues,
  createControlAsset,
  createControlIssue,
  createControlIssueAttachment,
  createControlIssueComment,
  createControlIssueLabel,
  type Database,
  findControlIssueById,
  hideControlIssue,
  incrementTeamIssueCounter,
  listControlIssueComments,
  listControlIssueLabels,
  listControlIssues,
  releaseControlIssueCheckout,
  removeControlIssueLabel,
  updateControlIssue,
  updateControlIssueStatus,
} from "@openbeam/db";
import type { CreateControlIssueInput } from "@openbeam/types/control/validators/issues";
import { ControlServiceError } from "./errors";

const MENTION_PATTERN = /@(\w[\w-]*)/g;

export async function createControlIssueForTeam(
  db: Database,
  teamId: string,
  input: CreateControlIssueInput
) {
  const { issueCounter, issuePrefix } = await incrementTeamIssueCounter(
    db,
    teamId
  );

  const identifier = `${issuePrefix ?? "OP"}-${issueCounter}`;

  return createControlIssue(db, {
    teamId,
    title: input.title,
    description: input.description ?? undefined,
    status: input.status,
    priority: input.priority,
    projectId: input.projectId ?? undefined,
    goalId: input.goalId ?? undefined,
    parentId: input.parentId ?? undefined,
    assigneeAgentId: input.assigneeAgentId ?? undefined,
    assigneeUserId: input.assigneeUserId ?? undefined,
    billingCode: input.billingCode ?? undefined,
    issueNumber: issueCounter,
    identifier,
  });
}

export async function getControlIssueForTeam(
  db: Database,
  teamId: string,
  issueId: string
) {
  const issue = await findControlIssueById(db, issueId, teamId);
  if (!issue) {
    throw ControlServiceError.notFound("Issue");
  }
  return issue;
}

export async function listControlIssuesForTeam(
  db: Database,
  teamId: string,
  options?: {
    status?: string | string[];
    assigneeAgentId?: string;
    projectId?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }
) {
  return await listControlIssues(db, teamId, {
    status: options?.status as never,
    assigneeAgentId: options?.assigneeAgentId,
    projectId: options?.projectId,
    parentId: options?.parentId,
    limit: options?.limit,
    offset: options?.offset,
  });
}

export async function countControlIssuesForTeam(
  db: Database,
  teamId: string,
  status?: string | string[]
) {
  return await countControlIssues(db, teamId, status as never);
}

export async function updateControlIssueForTeam(
  db: Database,
  teamId: string,
  issueId: string,
  data: Record<string, unknown>
) {
  await getControlIssueForTeam(db, teamId, issueId);

  if (typeof data.status === "string") {
    await updateControlIssueStatus(db, issueId, teamId, data.status as never);
  }

  const { status: _status, ...rest } = data;
  if (Object.keys(rest).length > 0) {
    await updateControlIssue(db, issueId, teamId, rest as never);
  }
}

export async function checkoutControlIssueForTeam(
  db: Database,
  params: {
    teamId: string;
    issueId: string;
    runId: string;
    agentNameKey: string;
    expectedStatuses?: string[];
  }
) {
  const issue = await getControlIssueForTeam(db, params.teamId, params.issueId);

  if (
    params.expectedStatuses &&
    params.expectedStatuses.length > 0 &&
    !params.expectedStatuses.includes(issue.status)
  ) {
    throw ControlServiceError.conflict(
      `Issue is in ${issue.status} status, expected one of: ${params.expectedStatuses.join(", ")}`
    );
  }

  if (issue.checkoutRunId) {
    throw ControlServiceError.conflict("Issue is already checked out");
  }

  const result = await checkoutControlIssue(db, {
    id: params.issueId,
    teamId: params.teamId,
    runId: params.runId,
    agentNameKey: params.agentNameKey,
  });

  if (result.count === 0) {
    throw ControlServiceError.conflict("Issue was checked out by another run");
  }
}

export async function releaseControlIssueForTeam(
  db: Database,
  teamId: string,
  issueId: string
) {
  await getControlIssueForTeam(db, teamId, issueId);
  await releaseControlIssueCheckout(db, issueId, teamId);
}

export async function hideControlIssueForTeam(
  db: Database,
  teamId: string,
  issueId: string
) {
  await getControlIssueForTeam(db, teamId, issueId);
  await hideControlIssue(db, issueId, teamId);
}

export async function addControlIssueCommentForTeam(
  db: Database,
  params: {
    teamId: string;
    issueId: string;
    body: string;
    authorAgentId?: string;
    authorUserId?: string;
  }
) {
  await getControlIssueForTeam(db, params.teamId, params.issueId);

  const comment = await createControlIssueComment(db, {
    teamId: params.teamId,
    issueId: params.issueId,
    body: params.body,
    authorAgentId: params.authorAgentId,
    authorUserId: params.authorUserId,
  });

  const mentions = extractMentions(params.body);

  return { comment, mentions };
}

export async function listControlIssueCommentsForTeam(
  db: Database,
  teamId: string,
  issueId: string
) {
  return await listControlIssueComments(db, teamId, issueId);
}

export async function listControlIssueLabelsForTeam(
  db: Database,
  teamId: string
) {
  return await listControlIssueLabels(db, teamId);
}

export async function createControlIssueLabelForTeam(
  db: Database,
  teamId: string,
  data: { name: string; color: string }
) {
  return await createControlIssueLabel(db, { teamId, ...data });
}

export async function assignControlIssueLabelForTeam(
  db: Database,
  params: { teamId: string; issueId: string; labelId: string }
) {
  return await assignControlIssueLabel(db, params);
}

export async function removeControlIssueLabelForTeam(
  db: Database,
  issueId: string,
  labelId: string
) {
  return await removeControlIssueLabel(db, issueId, labelId);
}

export async function createControlIssueAttachmentForTeam(
  db: Database,
  params: {
    teamId: string;
    issueId: string;
    provider: string;
    objectKey: string;
    contentType: string;
    byteSize: number;
    sha256: string;
    originalFilename?: string;
    createdByAgentId?: string;
    createdByUserId?: string;
    issueCommentId?: string;
  }
) {
  await getControlIssueForTeam(db, params.teamId, params.issueId);

  const asset = await createControlAsset(db, {
    teamId: params.teamId,
    provider: params.provider,
    objectKey: params.objectKey,
    contentType: params.contentType,
    byteSize: params.byteSize,
    sha256: params.sha256,
    originalFilename: params.originalFilename,
    createdByAgentId: params.createdByAgentId,
    createdByUserId: params.createdByUserId,
  });

  return createControlIssueAttachment(db, {
    teamId: params.teamId,
    issueId: params.issueId,
    assetId: asset.id,
    issueCommentId: params.issueCommentId,
  });
}

export async function getIssueAncestors(
  db: Database,
  teamId: string,
  issueId: string
) {
  const ancestors: Array<{
    id: string;
    title: string;
    identifier: string | null;
  }> = [];
  let currentId: string | null = issueId;
  let depth = 0;

  while (currentId && depth < 50) {
    const issue = await findControlIssueById(db, currentId, teamId);
    if (!issue) {
      break;
    }
    if (depth > 0) {
      ancestors.push({
        id: issue.id,
        title: issue.title,
        identifier: issue.identifier,
      });
    }
    currentId = issue.parentId;
    depth += 1;
  }

  return ancestors;
}

function extractMentions(text: string): string[] {
  const matches = text.matchAll(MENTION_PATTERN);
  return [
    ...new Set([...matches].map((m) => m[1]).filter(Boolean)),
  ] as string[];
}
