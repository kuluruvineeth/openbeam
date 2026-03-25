import type { IroncladClient } from "../client";

export interface IroncladApproval {
  id: string;
  workflowId: string;
  role: string;
  status: string;
  assignee: {
    id: string;
    name: string;
    email: string;
  };
  completedDate?: string;
  created: string;
  lastUpdated: string;
}

interface ApprovalsResponse {
  list: IroncladApproval[];
}

export async function listApprovals(
  client: IroncladClient,
  workflowId: string
): Promise<IroncladApproval[]> {
  const response = await client.get<ApprovalsResponse>(
    `/workflows/${workflowId}/approvals`
  );
  return response.list;
}
