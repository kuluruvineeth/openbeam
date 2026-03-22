import type {
  ClickUpComment,
  ClickUpTask,
} from "@openbeam/types/services/connectors/clickup";
import type { ClickUpClient } from "../client";

const TASKS_PER_PAGE = 100;

interface TasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

interface CommentsResponse {
  comments: ClickUpComment[];
}

export async function* getListTasks(
  client: ClickUpClient,
  listId: string,
  options: { dateUpdatedGt?: number; includeClosed?: boolean } = {}
): AsyncGenerator<ClickUpTask> {
  let page = 0;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      subtasks: "true",
      include_closed: String(options.includeClosed ?? true),
      order_by: "updated",
    };

    if (options.dateUpdatedGt) {
      params.date_updated_gt = String(options.dateUpdatedGt);
    }

    const response = await client.get<TasksResponse>(
      `/list/${listId}/task`,
      params
    );

    for (const task of response.tasks) {
      yield task;
    }

    if (response.last_page || response.tasks.length < TASKS_PER_PAGE) {
      break;
    }

    page += 1;
  }
}

export async function getTaskComments(
  client: ClickUpClient,
  taskId: string
): Promise<ClickUpComment[]> {
  const response = await client.get<CommentsResponse>(
    `/task/${taskId}/comment`
  );
  return response.comments;
}
