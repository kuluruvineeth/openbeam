import type { DoceboClient } from "../client";

export type DoceboEnrollment = {
  id: number;
  user_id: number;
  username: string;
  user_fullname: string;
  course_id: number;
  course_name: string;
  course_code: string;
  status: string;
  completion_date: string | null;
  enrollment_date: string;
  date_last_updated: string;
  score: number | null;
  progress: number;
};

export function listAllEnrollments(
  client: DoceboClient,
  params?: Record<string, string>
): AsyncGenerator<DoceboEnrollment[], void, undefined> {
  return client.listPaged<DoceboEnrollment>("/learn/v1/enrollment", params);
}

export function listEnrollmentsUpdatedSince(
  client: DoceboClient,
  since: string
): AsyncGenerator<DoceboEnrollment[], void, undefined> {
  return client.listPaged<DoceboEnrollment>("/learn/v1/enrollment", {
    last_update_from: since,
  });
}
