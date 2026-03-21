import type { AtlassianClient } from "../../atlassian/client";
import { archivePage as apiArchivePage } from "../api/pages";

export interface ArchiveActionResult {
  success: boolean;
  pageId?: string;
  error?: string;
}

export async function archiveConfluencePage(
  client: AtlassianClient,
  pageId: string
): Promise<ArchiveActionResult> {
  try {
    const page = await apiArchivePage(client, pageId);
    return { success: true, pageId: page.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive page",
    };
  }
}
