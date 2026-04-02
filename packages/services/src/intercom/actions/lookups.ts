import type { IntercomClient } from "../client";

interface AdminListResult {
  success: boolean;
  admins?: Array<{ id: string; name: string; email: string }>;
  error?: string;
}

interface TagListResult {
  success: boolean;
  tags?: Array<{ id: string; name: string }>;
  error?: string;
}

export async function listIntercomAdmins(
  client: IntercomClient
): Promise<AdminListResult> {
  try {
    const data = await client.get<{
      type: string;
      admins: Array<{ id: string; name: string; email: string }>;
    }>("/admins");

    return {
      success: true,
      admins: data.admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list admins",
    };
  }
}

export async function listIntercomTags(
  client: IntercomClient
): Promise<TagListResult> {
  try {
    const data = await client.get<{
      type: string;
      data: Array<{ id: string; name: string }>;
    }>("/tags");

    return {
      success: true,
      tags: data.data.map((t) => ({ id: t.id, name: t.name })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list tags",
    };
  }
}
