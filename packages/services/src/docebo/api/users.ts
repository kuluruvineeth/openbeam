import type { DoceboClient } from "../client";

export type DoceboUser = {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  status: string;
  branch_name: string;
  date_creation: string;
  date_last_updated: string;
  expiration_date: string | null;
  language: string;
};

export function listAllUsers(
  client: DoceboClient,
  params?: Record<string, string>
): AsyncGenerator<DoceboUser[], void, undefined> {
  return client.listPaged<DoceboUser>("/manage/v1/user", params);
}

export function listUsersUpdatedSince(
  client: DoceboClient,
  since: string
): AsyncGenerator<DoceboUser[], void, undefined> {
  return client.listPaged<DoceboUser>("/manage/v1/user", {
    last_update_from: since,
  });
}
