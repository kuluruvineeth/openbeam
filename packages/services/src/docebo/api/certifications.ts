import type { DoceboClient } from "../client";

export type DoceboCertification = {
  id: number;
  title: string;
  code: string;
  description: string;
  status: string;
  duration: number;
  expiration_days: number | null;
  date_creation: string;
  date_last_updated: string;
};

export function listAllCertifications(
  client: DoceboClient,
  params?: Record<string, string>
): AsyncGenerator<DoceboCertification[], void, undefined> {
  return client.listPaged<DoceboCertification>(
    "/learn/v1/certifications",
    params
  );
}

export function listCertificationsUpdatedSince(
  client: DoceboClient,
  since: string
): AsyncGenerator<DoceboCertification[], void, undefined> {
  return client.listPaged<DoceboCertification>("/learn/v1/certifications", {
    last_update_from: since,
  });
}
