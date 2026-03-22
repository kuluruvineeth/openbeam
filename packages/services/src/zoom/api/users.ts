import type { ZoomUser } from "@openbeam/types/services/connectors/zoom";
import type { ZoomClient } from "../client";

type UsersListResponse = {
  users: ZoomUser[];
  next_page_token?: string;
  page_size?: number;
  total_records?: number;
};

export async function* getAllUsers(
  client: ZoomClient,
  includeEmails?: string[],
  excludeEmails?: string[]
): AsyncGenerator<ZoomUser[], void, undefined> {
  const includeSet = includeEmails?.length
    ? new Set(includeEmails.map((e) => e.toLowerCase()))
    : undefined;
  const excludeSet = excludeEmails?.length
    ? new Set(excludeEmails.map((e) => e.toLowerCase()))
    : undefined;

  for await (const page of client.paginate<UsersListResponse>("/users", {
    page_size: "300",
    status: "active",
  })) {
    const users = (page.users ?? []).filter((user) => {
      const email = user.email.toLowerCase();
      if (includeSet && !includeSet.has(email)) {
        return false;
      }
      if (excludeSet?.has(email)) {
        return false;
      }
      return true;
    });

    if (users.length > 0) {
      yield users;
    }
  }
}
