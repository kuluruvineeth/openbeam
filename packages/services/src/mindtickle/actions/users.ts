import type { MindtickleClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface InviteUserParams {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface GetUserParams {
  userId: string;
}

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
}

export async function inviteUser(
  client: MindtickleClient,
  params: InviteUserParams
): Promise<ActionResult> {
  try {
    const body = {
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
      ...(params.role && { role: params.role }),
    };

    const result = await client.post<{ id: string }>(
      "/services/data/v2.0/mtobjects/User",
      body
    );

    return { success: true, id: result.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to invite user",
    };
  }
}

export async function getUser(
  client: MindtickleClient,
  params: GetUserParams
): Promise<ActionResult & { user?: UserResponse }> {
  try {
    const user = await client.get<UserResponse>(
      `/services/data/v2.0/mtobjects/User/${params.userId}`
    );

    return { success: true, id: user.id, user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user",
    };
  }
}
