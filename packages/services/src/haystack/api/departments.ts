import type { HaystackClient } from "../client";

export interface HaystackDepartment {
  id: string;
  name: string;
  description?: string;
  head?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  parent?: {
    id: string;
    name: string;
  };
  headcount: number;
  created_at: string;
  updated_at: string;
}

interface DepartmentsResponse {
  data: HaystackDepartment[];
  pagination: {
    total: number;
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

interface ListDepartmentsOptions {
  updatedAfter?: string;
}

export async function* listDepartments(
  client: HaystackClient,
  options: ListDepartmentsOptions = {}
): AsyncGenerator<HaystackDepartment[], void, undefined> {
  let offset = 0;
  const limit = 100;

  while (true) {
    const params: Record<string, string> = {
      offset: String(offset),
      limit: String(limit),
    };

    if (options.updatedAfter) {
      params.updated_after = options.updatedAfter;
    }

    const response = await client.get<DepartmentsResponse>(
      "/departments",
      params
    );

    if (response.data.length > 0) {
      yield response.data;
    }

    if (!response.pagination.has_more) {
      break;
    }
    offset += limit;
  }
}
