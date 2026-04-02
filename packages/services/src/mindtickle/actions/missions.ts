import type { MindtickleClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface CreateMissionParams {
  name: string;
  description: string;
  mission_type: string;
  due_date?: string;
  tags?: string[];
}

interface UpdateContentParams {
  contentId: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

export async function createMission(
  client: MindtickleClient,
  params: CreateMissionParams
): Promise<ActionResult> {
  try {
    const body = {
      name: params.name,
      description: params.description,
      mission_type: params.mission_type,
      ...(params.due_date && { due_date: params.due_date }),
      ...(params.tags?.length && { tags: params.tags }),
    };

    const result = await client.post<{
      id: string;
      name: string;
    }>("/openapi/missions", body);

    return {
      success: true,
      id: result.id,
      url: `https://app.mindtickle.com/missions/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create mission",
    };
  }
}

export async function updateContent(
  client: MindtickleClient,
  params: UpdateContentParams
): Promise<ActionResult> {
  try {
    const body = {
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.category && { category: params.category }),
      ...(params.tags?.length && { tags: params.tags }),
    };

    const result = await client.patch<{
      id: string;
      title: string;
    }>(`/openapi/content/${params.contentId}`, body);

    return {
      success: true,
      id: result.id ?? params.contentId,
      url: `https://app.mindtickle.com/content/${params.contentId}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update content",
    };
  }
}
