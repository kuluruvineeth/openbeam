import type { DoceboClient } from "../client";

export type DoceboCourse = {
  id: number;
  name: string;
  code: string;
  type: string;
  status: string;
  description: string;
  category: { id: number; name: string } | null;
  duration: number;
  language: string;
  date_creation: string;
  date_last_updated: string;
  slug_name: string;
  enrollment_count: number;
  image_url: string;
};

export function listAllCourses(
  client: DoceboClient,
  params?: Record<string, string>
): AsyncGenerator<DoceboCourse[], void, undefined> {
  return client.listPaged<DoceboCourse>("/learn/v1/courses", params);
}

export function listCoursesUpdatedSince(
  client: DoceboClient,
  since: string
): AsyncGenerator<DoceboCourse[], void, undefined> {
  return client.listPaged<DoceboCourse>("/learn/v1/courses", {
    last_update_from: since,
  });
}
