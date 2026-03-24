import type { DoceboClient } from "../client";

export type DoceboLearningPlan = {
  id: number;
  name: string;
  description: string;
  status: string;
  courses_count: number;
  date_creation: string;
  date_last_updated: string;
  duration: number;
  category: { id: number; name: string } | null;
};

export function listAllLearningPlans(
  client: DoceboClient,
  params?: Record<string, string>
): AsyncGenerator<DoceboLearningPlan[], void, undefined> {
  return client.listPaged<DoceboLearningPlan>(
    "/learn/v1/learningplans",
    params
  );
}

export function listLearningPlansUpdatedSince(
  client: DoceboClient,
  since: string
): AsyncGenerator<DoceboLearningPlan[], void, undefined> {
  return client.listPaged<DoceboLearningPlan>("/learn/v1/learningplans", {
    last_update_from: since,
  });
}
