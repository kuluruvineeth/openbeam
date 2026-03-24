import type { HighspotClient } from "../client";

export interface PitchActionResult {
  success: boolean;
  pitchId?: string;
  url?: string;
  error?: string;
}

export async function createHighspotPitch(
  client: HighspotClient,
  params: {
    title: string;
    recipients: { email: string; name?: string }[];
    item_ids: string[];
    description?: string;
  }
): Promise<PitchActionResult> {
  try {
    const result = await client.post<{
      data: { id: string; url: string };
    }>("/pitches", {
      title: params.title,
      recipients: params.recipients,
      item_ids: params.item_ids,
      ...(params.description && { description: params.description }),
    });
    return {
      success: true,
      pitchId: result.data.id,
      url: result.data.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create pitch",
    };
  }
}
