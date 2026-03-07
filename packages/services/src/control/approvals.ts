import {
  createControlApproval,
  createControlApprovalComment,
  type Database,
  findControlApprovalById,
  linkControlIssueApproval,
  listControlApprovals,
  resolveControlApproval,
} from "@openbeam/db";
import type { CreateControlApprovalInput } from "@openbeam/types/control/validators/approvals";
import { ControlServiceError } from "./errors";

export async function createControlApprovalForTeam(
  db: Database,
  teamId: string,
  input: CreateControlApprovalInput
) {
  return await createControlApproval(db, {
    teamId,
    type: input.type as never,
    requestedByAgentId: input.requestedByAgentId ?? undefined,
    payload: input.payload,
  });
}

export async function getControlApprovalForTeam(
  db: Database,
  teamId: string,
  approvalId: string
) {
  const approval = await findControlApprovalById(db, approvalId, teamId);
  if (!approval) {
    throw ControlServiceError.notFound("Approval");
  }
  return approval;
}

export async function listControlApprovalsForTeam(
  db: Database,
  teamId: string,
  options?: { status?: string; type?: string; limit?: number }
) {
  return await listControlApprovals(db, teamId, {
    status: options?.status as never,
    type: options?.type as never,
    limit: options?.limit,
  });
}

export async function approveControlApprovalForTeam(
  db: Database,
  params: {
    teamId: string;
    approvalId: string;
    decidedByUserId: string;
    decisionNote?: string;
  }
) {
  const approval = await getControlApprovalForTeam(
    db,
    params.teamId,
    params.approvalId
  );
  if (approval.status !== "PENDING") {
    throw ControlServiceError.invalidState(
      `Approval is already ${approval.status}`
    );
  }

  await resolveControlApproval(db, params.approvalId, params.teamId, {
    status: "APPROVED",
    decidedByUserId: params.decidedByUserId,
    decisionNote: params.decisionNote,
  });
}

export async function rejectControlApprovalForTeam(
  db: Database,
  params: {
    teamId: string;
    approvalId: string;
    decidedByUserId: string;
    decisionNote?: string;
  }
) {
  const approval = await getControlApprovalForTeam(
    db,
    params.teamId,
    params.approvalId
  );
  if (approval.status !== "PENDING") {
    throw ControlServiceError.invalidState(
      `Approval is already ${approval.status}`
    );
  }

  await resolveControlApproval(db, params.approvalId, params.teamId, {
    status: "REJECTED",
    decidedByUserId: params.decidedByUserId,
    decisionNote: params.decisionNote,
  });
}

export async function requestControlApprovalRevisionForTeam(
  db: Database,
  params: {
    teamId: string;
    approvalId: string;
    decidedByUserId: string;
    decisionNote?: string;
  }
) {
  const approval = await getControlApprovalForTeam(
    db,
    params.teamId,
    params.approvalId
  );
  if (approval.status !== "PENDING") {
    throw ControlServiceError.invalidState(
      `Approval is already ${approval.status}`
    );
  }

  await resolveControlApproval(db, params.approvalId, params.teamId, {
    status: "REVISION_REQUESTED",
    decidedByUserId: params.decidedByUserId,
    decisionNote: params.decisionNote,
  });
}

export async function addControlApprovalCommentForTeam(
  db: Database,
  params: {
    teamId: string;
    approvalId: string;
    body: string;
    authorAgentId?: string;
    authorUserId?: string;
  }
) {
  await getControlApprovalForTeam(db, params.teamId, params.approvalId);

  return createControlApprovalComment(db, {
    teamId: params.teamId,
    approvalId: params.approvalId,
    body: params.body,
    authorAgentId: params.authorAgentId,
    authorUserId: params.authorUserId,
  });
}

export async function linkControlIssueToApprovalForTeam(
  db: Database,
  params: { teamId: string; issueId: string; approvalId: string }
) {
  await getControlApprovalForTeam(db, params.teamId, params.approvalId);
  return linkControlIssueApproval(db, params);
}
