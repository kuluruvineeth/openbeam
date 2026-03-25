import type { HaystackClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface UpdatePersonParams {
  personId: string;
  title?: string;
  phone?: string;
  bio?: string;
  pronouns?: string;
}

export async function updatePerson(
  client: HaystackClient,
  params: UpdatePersonParams
): Promise<ActionResult> {
  try {
    const body: Record<string, unknown> = {
      ...(params.title && { title: params.title }),
      ...(params.phone && { phone: params.phone }),
      ...(params.bio && { bio: params.bio }),
      ...(params.pronouns && { pronouns: params.pronouns }),
    };

    const result = await client.put<{ data: { id: string } }>(
      `/people/${params.personId}`,
      body
    );

    return {
      success: true,
      id: result.data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update person",
    };
  }
}
