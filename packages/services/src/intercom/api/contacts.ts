import type { IntercomClient } from "../client";

export type IntercomContact = {
  type: string;
  id: string;
  role: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  created_at: number;
  updated_at: number;
  signed_up_at: number | null;
  last_seen_at: number | null;
  external_id: string | null;
  unsubscribed_from_emails: boolean;
  location?: { city?: string; country?: string; region?: string };
  companies?: { data: Array<{ id: string; name?: string }> };
};

type ContactListResponse = {
  type: string;
  data: IntercomContact[];
};

export async function* getAllContacts(
  client: IntercomClient
): AsyncGenerator<IntercomContact[], void, undefined> {
  for await (const page of client.paginateList<ContactListResponse>(
    "/contacts",
    { per_page: "150" }
  )) {
    if (page.data.length > 0) {
      yield page.data;
    }
  }
}
