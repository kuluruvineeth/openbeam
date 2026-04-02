import type { PipedriveClient } from "../client";

interface PersonListResult {
  success: boolean;
  persons?: Array<{ id: string; name: string; email: string }>;
  error?: string;
}

interface OrgListResult {
  success: boolean;
  organizations?: Array<{ id: string; name: string }>;
  error?: string;
}

export async function listPipedrivePersons(
  client: PipedriveClient
): Promise<PersonListResult> {
  try {
    const data = await client.list<{
      id: number;
      name: string;
      emails: Array<{ value: string }>;
    }>("/persons", undefined, 100);

    const items = data.data ?? [];
    return {
      success: true,
      persons: items.map((p) => ({
        id: String(p.id),
        name: p.name,
        email: p.emails?.[0]?.value ?? "",
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list persons",
    };
  }
}

export async function listPipedriveOrganizations(
  client: PipedriveClient
): Promise<OrgListResult> {
  try {
    const data = await client.list<{
      id: number;
      name: string;
    }>("/organizations", undefined, 100);

    const items = data.data ?? [];
    return {
      success: true,
      organizations: items.map((o) => ({
        id: String(o.id),
        name: o.name,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list organizations",
    };
  }
}
