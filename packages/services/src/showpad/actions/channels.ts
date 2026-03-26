import type { ShowpadClient } from "../client";

export interface ChannelActionResult {
  success: boolean;
  channelId?: string;
  url?: string;
  error?: string;
}

export async function createShowpadChannel(
  client: ShowpadClient,
  name: string,
  description?: string
): Promise<ChannelActionResult> {
  try {
    const result = await client.createChannel(name, description);
    return {
      success: true,
      channelId: result.id,
      url: `https://${client.subdomain}.showpad.biz/#!/channel/${result.id}`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create channel",
    };
  }
}
