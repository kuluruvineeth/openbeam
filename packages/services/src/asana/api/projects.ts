import type { AsanaClient } from "../client";

export type AsanaProject = {
  gid: string;
  name: string;
  notes?: string;
  color?: string;
  created_at: string;
  modified_at: string;
  owner?: { gid: string; name: string };
  team?: { gid: string; name: string };
  current_status?: {
    text: string;
    color: string;
    modified_at: string;
    author?: { gid: string; name: string };
  };
  permalink_url: string;
  archived: boolean;
  public: boolean;
  members?: Array<{ gid: string; name: string }>;
};

type ProjectsResponse = {
  data: AsanaProject[];
  next_page?: { offset: string; path: string; uri: string } | null;
};

const PROJECT_FIELDS = [
  "gid",
  "name",
  "notes",
  "color",
  "created_at",
  "modified_at",
  "owner.gid",
  "owner.name",
  "team.gid",
  "team.name",
  "current_status",
  "permalink_url",
  "archived",
  "public",
].join(",");

export async function* getWorkspaceProjects(
  client: AsanaClient,
  workspaceGid: string,
  options: { limit?: number; archived?: boolean } = {}
): AsyncGenerator<AsanaProject[]> {
  const limit = options.limit ?? 100;
  let offset: string | undefined;

  do {
    const params: Record<string, string> = {
      workspace: workspaceGid,
      opt_fields: PROJECT_FIELDS,
      limit: String(limit),
    };

    if (options.archived !== undefined) {
      params.archived = String(options.archived);
    }

    if (offset) {
      params.offset = offset;
    }

    const result = await client.get<ProjectsResponse>("/projects", params);

    if (result.data.length > 0) {
      yield result.data;
    }

    offset = result.next_page?.offset;
  } while (offset);
}
