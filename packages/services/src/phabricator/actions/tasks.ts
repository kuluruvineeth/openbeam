import type { PhabricatorClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateTaskParams {
  title: string;
  description?: string;
  ownerPHID?: string;
  priority?: string;
  projectPHIDs?: string[];
}

interface UpdateTaskParams {
  taskId: number;
  title?: string;
  description?: string;
  ownerPHID?: string;
  priority?: string;
  status?: string;
}

interface TransactionEntry {
  type: string;
  value: unknown;
}

export async function createTask(
  client: PhabricatorClient,
  params: CreateTaskParams
): Promise<ActionResult> {
  try {
    const transactions: TransactionEntry[] = [
      { type: "title", value: params.title },
    ];

    if (params.description) {
      transactions.push({ type: "description", value: params.description });
    }
    if (params.ownerPHID) {
      transactions.push({ type: "owner", value: params.ownerPHID });
    }
    if (params.priority) {
      transactions.push({ type: "priority", value: params.priority });
    }
    if (params.projectPHIDs?.length) {
      transactions.push({ type: "projects.add", value: params.projectPHIDs });
    }

    const result = await client.post<{
      object: { id: number; phid: string };
    }>("maniphest.edit", { transactions });

    return {
      success: true,
      id: String(result.object.id),
      url: `${client.instanceUrl}/T${result.object.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export async function updateTask(
  client: PhabricatorClient,
  params: UpdateTaskParams
): Promise<ActionResult> {
  try {
    const transactions: TransactionEntry[] = [];

    if (params.title) {
      transactions.push({ type: "title", value: params.title });
    }
    if (params.description) {
      transactions.push({ type: "description", value: params.description });
    }
    if (params.ownerPHID) {
      transactions.push({ type: "owner", value: params.ownerPHID });
    }
    if (params.priority) {
      transactions.push({ type: "priority", value: params.priority });
    }
    if (params.status) {
      transactions.push({ type: "status", value: params.status });
    }

    const result = await client.post<{
      object: { id: number; phid: string };
    }>("maniphest.edit", {
      objectIdentifier: `T${params.taskId}`,
      transactions,
    });

    return {
      success: true,
      id: String(result.object.id),
      url: `${client.instanceUrl}/T${result.object.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}
