import type { FifteenFiveClient } from "../client";

interface ActionResult {
  success: boolean;
  id?: number;
  error?: string;
}

interface CreateHighFiveParams {
  senderId: number;
  receiverId: number;
  text: string;
}

export async function createHighFive(
  client: FifteenFiveClient,
  params: CreateHighFiveParams
): Promise<ActionResult> {
  try {
    const body = {
      sender: params.senderId,
      receiver: params.receiverId,
      text: params.text,
    };

    const result = await client.post<{
      id: number;
      sender: number;
      receiver: number;
      text: string;
    }>("/high-five/", body);

    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create high five",
    };
  }
}
