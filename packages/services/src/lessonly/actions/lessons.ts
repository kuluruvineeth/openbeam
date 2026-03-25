import type { LessonlyClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

interface UpdateLessonParams {
  lessonId: number;
  title?: string;
  description?: string;
  tags?: string[];
}

export async function updateLesson(
  client: LessonlyClient,
  params: UpdateLessonParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.title && { title: params.title }),
      ...(params.description && { description: params.description }),
      ...(params.tags && {
        tags: params.tags.map((name) => ({ name })),
      }),
    };

    const result = await client.put<{
      id: number;
      links: { shareable: string };
    }>(`/lessons/${params.lessonId}`, body);

    return {
      success: true,
      id: String(result.id),
      url: result.links?.shareable,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update lesson",
    };
  }
}
