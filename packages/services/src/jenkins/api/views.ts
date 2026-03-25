import type { JenkinsClient } from "../client";

export interface JenkinsView {
  name: string;
  url: string;
  description?: string;
  jobs?: Array<{ name: string; url: string; color: string }>;
}

interface ViewListResponse {
  views?: JenkinsView[];
}

const VIEW_TREE = "views[name,url,description,jobs[name,url,color]]";

export async function listViews(client: JenkinsClient): Promise<JenkinsView[]> {
  const response = await client.get<ViewListResponse>("/api/json", {
    tree: VIEW_TREE,
  });
  return (response.views ?? []).filter(
    (v) => v.name !== "all" && v.name !== "All"
  );
}
