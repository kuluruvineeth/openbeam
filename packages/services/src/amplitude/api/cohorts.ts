import type { AmplitudeClient } from "../client";

export interface AmplitudeCohort {
  id: string;
  name: string;
  description?: string;
  definition?: Record<string, unknown>;
  size?: number;
  lastComputed?: string;
  lastModified?: string;
  createdAt?: string;
  owner?: string;
  archived?: boolean;
  published?: boolean;
  appId?: number;
}

interface CohortListResponse {
  cohorts?: AmplitudeCohort[];
}

export async function listCohorts(
  client: AmplitudeClient
): Promise<AmplitudeCohort[]> {
  const response = await client.get<CohortListResponse>("/cohorts");
  return (response.cohorts ?? []).filter((c) => !c.archived);
}
