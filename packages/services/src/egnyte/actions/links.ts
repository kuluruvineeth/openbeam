import type { EgnyteClient } from "../client";

export interface LinkActionResult {
  success: boolean;
  linkId?: string;
  url?: string;
  error?: string;
}

export async function createEgnyteSharedLink(
  client: EgnyteClient,
  path: string,
  linkType: "file" | "folder",
  accessibility = "domain"
): Promise<LinkActionResult> {
  try {
    const result = await client.createLink(path, linkType, accessibility);
    return {
      success: true,
      linkId: result.id,
      url: result.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create shared link",
    };
  }
}
