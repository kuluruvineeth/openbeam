import type { IroncladTransformContext } from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { IroncladApproval } from "../api/approvals";

function buildApprovalContent(approval: IroncladApproval): string {
  const parts: string[] = [];

  parts.push(`Role: ${approval.role}`);
  parts.push(`Status: ${approval.status}`);

  if (approval.assignee) {
    parts.push(`Reviewer: ${approval.assignee.name}`);
  }

  if (approval.completedDate) {
    parts.push(`Completed: ${approval.completedDate}`);
  }

  return parts.join("\n");
}

export async function transformApproval(
  approval: IroncladApproval,
  workflowTitle: string,
  context: IroncladTransformContext
): Promise<GenericDocument> {
  const title = `Approval: ${approval.role} - ${workflowTitle}`;
  const content = buildApprovalContent(approval);

  const metadata: GenericDocument["metadata"] = {
    role: approval.role,
    status: approval.status,
    workflowId: approval.workflowId,
    reviewerName: approval.assignee?.name,
    reviewerEmail: approval.assignee?.email,
    ...(approval.completedDate && { completedDate: approval.completedDate }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_approval_${approval.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: approval.id,
    document_type: "approval",
    document_subtype: approval.status,
    title,
    content,
    created_at: new Date(approval.created).getTime(),
    updated_at: new Date(approval.lastUpdated).getTime(),
    source_type: "ironclad",
    url: `https://ironcladapp.com/workflow/${approval.workflowId}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: approval.assignee?.name,
    author_email: approval.assignee?.email,
  };
}
