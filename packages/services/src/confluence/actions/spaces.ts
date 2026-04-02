import type { AtlassianClient } from "../../atlassian/client";

type ConfluenceSpace = {
  id: string;
  key: string;
  name: string;
  type: string;
  status: string;
};

type SpaceListResponse = {
  results: ConfluenceSpace[];
  _links?: { next?: string };
};

export type SpaceListResult = {
  success: boolean;
  spaces?: Array<{
    id: string;
    key: string;
    name: string;
    type: string;
  }>;
  error?: string;
};

export async function listConfluenceSpaces(
  client: AtlassianClient
): Promise<SpaceListResult> {
  try {
    const response = await client.get<SpaceListResponse>(
      "/wiki/api/v2/spaces",
      { limit: "250", status: "current" }
    );

    const spaces = response.results.map((s) => ({
      id: s.id,
      key: s.key,
      name: s.name,
      type: s.type,
    }));

    return { success: true, spaces };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list spaces",
    };
  }
}
