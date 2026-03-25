import type { LessonlyClient } from "../client";

export interface LessonlyGroup {
  id: number;
  name: string;
  description: string | null;
  members_count: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface GroupsResponse {
  type: string;
  groups: LessonlyGroup[];
  total_groups: number;
  page: number;
  total_pages: number;
}

interface ListGroupsOptions {
  updatedSince?: string;
}

export async function* listGroups(
  client: LessonlyClient,
  options: ListGroupsOptions = {}
): AsyncGenerator<LessonlyGroup[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
    };

    if (options.updatedSince) {
      params["filter[updated_at]"] = options.updatedSince;
    }

    const response = await client.get<GroupsResponse>("/groups", params);

    if (response.groups.length > 0) {
      yield response.groups;
    }

    if (page >= response.total_pages) {
      break;
    }
    page += 1;
  }
}
