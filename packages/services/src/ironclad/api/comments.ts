import type { IroncladClient } from "../client";

export interface IroncladComment {
  id: string;
  workflowId: string;
  body: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  created: string;
  lastUpdated: string;
}

interface CommentsResponse {
  list: IroncladComment[];
}

export async function listComments(
  client: IroncladClient,
  workflowId: string
): Promise<IroncladComment[]> {
  const response = await client.get<CommentsResponse>(
    `/workflows/${workflowId}/comments`
  );
  return response.list;
}
