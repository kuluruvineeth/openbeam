import type { GoogleChatClient } from "../client";

export interface ChatSpaceEntry {
  name: string;
  displayName: string;
  type: string;
}

export interface SpaceListResult {
  success: boolean;
  data?: ChatSpaceEntry[];
  error?: string;
}

export async function listChatSpaces(
  client: GoogleChatClient
): Promise<SpaceListResult> {
  try {
    const spaces: ChatSpaceEntry[] = [];

    for await (const batch of client.listSpaces()) {
      for (const space of batch) {
        spaces.push({
          name: space.name,
          displayName: space.displayName,
          type: space.type,
        });
      }
    }

    return { success: true, data: spaces };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to list spaces",
    };
  }
}
