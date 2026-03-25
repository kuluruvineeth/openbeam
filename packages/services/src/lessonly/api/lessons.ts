import type { LessonlyClient } from "../client";

export interface LessonlyLesson {
  id: number;
  title: string;
  assignees_count: number;
  completed_count: number;
  description: string | null;
  tags: { id: number; name: string }[];
  links: { shareable: string };
  retake_score: number;
  public: boolean;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface LessonlyLessonDetail extends LessonlyLesson {
  content_body: string | null;
}

interface LessonsResponse {
  type: string;
  lessons: LessonlyLesson[];
  total_lessons: number;
  page: number;
  total_pages: number;
}

interface ListLessonsOptions {
  updatedSince?: string;
}

export async function* listLessons(
  client: LessonlyClient,
  options: ListLessonsOptions = {}
): AsyncGenerator<LessonlyLesson[], void, undefined> {
  let page = 1;

  while (true) {
    const params: Record<string, string> = {
      page: String(page),
    };

    if (options.updatedSince) {
      params["filter[updated_at]"] = options.updatedSince;
    }

    const response = await client.get<LessonsResponse>("/lessons", params);

    if (response.lessons.length > 0) {
      yield response.lessons;
    }

    if (page >= response.total_pages) {
      break;
    }
    page += 1;
  }
}

export function getLesson(
  client: LessonlyClient,
  lessonId: number
): Promise<LessonlyLessonDetail> {
  return client.get<LessonlyLessonDetail>(`/lessons/${lessonId}`);
}
