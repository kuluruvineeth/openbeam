import type { NetsuiteClient } from "../client";

export type NetsuiteEmployee = {
  id: string;
  entityId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: { id: string; refName?: string };
  subsidiary?: { id: string; refName?: string };
  supervisor?: { id: string; refName?: string };
  isInactive?: boolean;
  hireDate?: string;
  releaseDate?: string;
  dateCreated?: string;
  lastModifiedDate?: string;
};

export function listAllEmployees(
  client: NetsuiteClient,
  params?: Record<string, string>
): AsyncGenerator<NetsuiteEmployee[], void, undefined> {
  return client.listAll<NetsuiteEmployee>("/employee", params);
}

export function listEmployeesUpdatedSince(
  client: NetsuiteClient,
  since: string
): AsyncGenerator<NetsuiteEmployee[], void, undefined> {
  return client.listAll<NetsuiteEmployee>("/employee", {
    q: `lastModifiedDate ON_OR_AFTER "${since}"`,
  });
}
