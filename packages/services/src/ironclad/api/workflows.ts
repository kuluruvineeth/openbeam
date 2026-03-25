import type { IroncladClient } from "../client";

export interface IroncladWorkflow {
  id: string;
  title: string;
  template: string;
  status: string;
  step: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  attributes: Record<string, unknown>;
  created: string;
  lastUpdated: string;
}

interface WorkflowsResponse {
  list: IroncladWorkflow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ListWorkflowsOptions {
  lastUpdated?: string;
}

export async function* listWorkflows(
  client: IroncladClient,
  options: ListWorkflowsOptions = {}
): AsyncGenerator<IroncladWorkflow[], void, undefined> {
  let page = 0;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      pageSize: "100",
    };

    if (options.lastUpdated) {
      params.filter = `lastUpdated>="${options.lastUpdated}"`;
    }

    const response = await client.get<WorkflowsResponse>("/workflows", params);

    if (response.list.length > 0) {
      yield response.list;
    }

    if (!response.hasMore) {
      break;
    }
    page += 1;
  }
}

export function getWorkflow(
  client: IroncladClient,
  workflowId: string
): Promise<IroncladWorkflow> {
  return client.get<IroncladWorkflow>(`/workflows/${workflowId}`);
}
