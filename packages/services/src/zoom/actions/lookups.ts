import type { ZoomClient } from "../client";

interface UserListResult {
  success: boolean;
  users?: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }>;
  error?: string;
}

export async function listZoomUsers(
  client: ZoomClient
): Promise<UserListResult> {
  try {
    const data = await client.get<{
      users: Array<{
        id: string;
        email: string;
        first_name: string;
        last_name: string;
      }>;
    }>("/users", { page_size: "300", status: "active" });

    return {
      success: true,
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list users",
    };
  }
}
