import type { AsanaClient } from "../client";

export type AsanaTask = {
  gid: string;
  name: string;
  notes: string;
  html_notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  modified_at: string;
  due_on?: string;
  due_at?: string;
  start_on?: string;
  assignee?: { gid: string; name: string };
  followers?: Array<{ gid: string; name: string }>;
  tags?: Array<{ gid: string; name: string }>;
  projects?: Array<{ gid: string; name: string }>;
  memberships?: Array<{
    project: { gid: string; name: string };
    section?: { gid: string; name: string };
  }>;
  custom_fields?: Array<{
    gid: string;
    name: string;
    display_value?: string;
    type: string;
  }>;
  parent?: { gid: string; name: string };
  permalink_url: string;
  resource_type: string;
};

type TasksResponse = {
  data: AsanaTask[];
  next_page?: { offset: string; path: string; uri: string } | null;
};

const TASK_FIELDS = [
  "gid",
  "name",
  "notes",
  "html_notes",
  "completed",
  "completed_at",
  "created_at",
  "modified_at",
  "due_on",
  "due_at",
  "start_on",
  "assignee.gid",
  "assignee.name",
  "tags.gid",
  "tags.name",
  "projects.gid",
  "projects.name",
  "memberships.project.gid",
  "memberships.project.name",
  "memberships.section.gid",
  "memberships.section.name",
  "custom_fields.gid",
  "custom_fields.name",
  "custom_fields.display_value",
  "custom_fields.type",
  "parent.gid",
  "parent.name",
  "permalink_url",
  "resource_type",
].join(",");

export async function* getProjectTasks(
  client: AsanaClient,
  projectGid: string,
  options: {
    completedSince?: string;
    modifiedSince?: string;
    limit?: number;
  } = {}
): AsyncGenerator<AsanaTask[]> {
  const limit = options.limit ?? 100;
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      opt_fields: TASK_FIELDS,
      limit: String(limit),
    };

    if (options.completedSince) {
      params.completed_since = options.completedSince;
    }

    if (offset) {
      params.offset = offset;
    }

    const result = await client.get<TasksResponse>(
      `/projects/${projectGid}/tasks`,
      params
    );

    if (result.data.length > 0) {
      yield result.data;
    }

    offset = result.next_page?.offset;
  } while (offset);
}

export async function* searchTasks(
  client: AsanaClient,
  workspaceGid: string,
  options: {
    modifiedAfter?: string;
    completedSince?: string;
    limit?: number;
    projectGids?: string[];
    sortBy?: string;
  } = {}
): AsyncGenerator<AsanaTask[]> {
  const limit = options.limit ?? 100;
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      opt_fields: TASK_FIELDS,
      limit: String(limit),
      sort_by: options.sortBy ?? "modified_at",
      sort_ascending: "true",
    };

    if (options.modifiedAfter) {
      params["modified_at.after"] = options.modifiedAfter;
    }

    if (options.completedSince) {
      params.completed_since = options.completedSince;
    }

    if (options.projectGids?.length) {
      params["projects.any"] = options.projectGids.join(",");
    }

    if (offset) {
      params.offset = offset;
    }

    const result = await client.get<TasksResponse>(
      `/workspaces/${workspaceGid}/tasks/search`,
      params
    );

    if (result.data.length > 0) {
      yield result.data;
    }

    offset = result.next_page?.offset;
  } while (offset);
}
