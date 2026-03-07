import type { Database } from "@openbeam/db";
import { expireApproval, updateApprovalEscalation } from "@openbeam/db";
import { ApplicationFailure } from "@temporalio/common";

export interface EscalationDependencies {
  db: Database;
}

export interface SendApprovalReminderInput {
  approvalId: string;
  executionId: string;
  nodeId: string;
}

export interface SendApprovalReminderOutput {
  reminded: boolean;
}

export interface EscalateApprovalInput {
  approvalId: string;
  executionId: string;
  nodeId: string;
  escalateToUserId: string;
}

export interface EscalateApprovalOutput {
  escalated: boolean;
}

export interface ExpireApprovalInput {
  approvalId: string;
  executionId: string;
  nodeId: string;
}

export interface ExpireApprovalOutput {
  expired: boolean;
}

export function createSendApprovalReminderActivity(
  deps: EscalationDependencies
) {
  return async function sendApprovalReminder(
    input: SendApprovalReminderInput
  ): Promise<SendApprovalReminderOutput> {
    const approval = await deps.db.agentCanvasApproval.findUnique({
      where: { id: input.approvalId },
      select: { status: true, reminderSentAt: true },
    });

    if (!approval) {
      throw ApplicationFailure.nonRetryable("Approval not found", "NOT_FOUND");
    }

    if (approval.status !== "PENDING") {
      return { reminded: false };
    }

    if (approval.reminderSentAt) {
      return { reminded: false };
    }

    await updateApprovalEscalation(deps.db, input.approvalId, {
      reminderSentAt: new Date(),
    });

    return { reminded: true };
  };
}

export function createEscalateApprovalActivity(deps: EscalationDependencies) {
  return async function escalateApproval(
    input: EscalateApprovalInput
  ): Promise<EscalateApprovalOutput> {
    const approval = await deps.db.agentCanvasApproval.findUnique({
      where: { id: input.approvalId },
      select: { status: true, escalatedAt: true },
    });

    if (!approval) {
      throw ApplicationFailure.nonRetryable("Approval not found", "NOT_FOUND");
    }

    if (approval.status !== "PENDING") {
      return { escalated: false };
    }

    if (approval.escalatedAt) {
      return { escalated: false };
    }

    await updateApprovalEscalation(deps.db, input.approvalId, {
      escalatedTo: input.escalateToUserId,
      escalatedAt: new Date(),
    });

    return { escalated: true };
  };
}

export function createExpireApprovalActivity(deps: EscalationDependencies) {
  return async function expireApprovalActivity(
    input: ExpireApprovalInput
  ): Promise<ExpireApprovalOutput> {
    const approval = await deps.db.agentCanvasApproval.findUnique({
      where: { id: input.approvalId },
      select: { status: true },
    });

    if (!approval) {
      throw ApplicationFailure.nonRetryable("Approval not found", "NOT_FOUND");
    }

    if (approval.status !== "PENDING") {
      return { expired: false };
    }

    await expireApproval(deps.db, input.approvalId);

    return { expired: true };
  };
}
