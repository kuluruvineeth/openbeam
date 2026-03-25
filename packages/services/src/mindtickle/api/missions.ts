import type { MindtickleClient } from "../client";

export interface MindtickleMission {
  id: string;
  name: string;
  description: string;
  mission_type: string;
  status: string;
  due_date: string | null;
  max_score: number;
  passing_score: number;
  created_by: {
    id: string;
    name: string;
    email: string;
  } | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface MissionsResponse {
  missions: MindtickleMission[];
  pagination: {
    total_records: number;
    total_pages: number;
    current_page: number;
  };
}

interface ListMissionsOptions {
  updatedSince?: string;
}

export async function* listMissions(
  client: MindtickleClient,
  options: ListMissionsOptions = {}
): AsyncGenerator<MindtickleMission[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
      limit: "100",
    };

    if (options.updatedSince) {
      params.updated_after = options.updatedSince;
    }

    const response = await client.get<MissionsResponse>("/missions", params);

    if (response.missions.length > 0) {
      yield response.missions;
    }

    if (page >= response.pagination.total_pages) {
      break;
    }
    page += 1;
  }
}
