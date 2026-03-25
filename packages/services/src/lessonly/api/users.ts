import type { LessonlyClient } from "../client";

export interface LessonlyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  role_id: number;
  groups: { id: number; name: string }[];
  custom_user_field_data: Record<string, string | number | boolean | null>;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface UsersResponse {
  type: string;
  users: LessonlyUser[];
  total_users: number;
  page: number;
  total_pages: number;
}

interface ListUsersOptions {
  updatedSince?: string;
}

export async function* listUsers(
  client: LessonlyClient,
  options: ListUsersOptions = {}
): AsyncGenerator<LessonlyUser[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
    };

    if (options.updatedSince) {
      params["filter[updated_at]"] = options.updatedSince;
    }

    const response = await client.get<UsersResponse>("/users", params);

    if (response.users.length > 0) {
      yield response.users;
    }

    if (page >= response.total_pages) {
      break;
    }
    page += 1;
  }
}
