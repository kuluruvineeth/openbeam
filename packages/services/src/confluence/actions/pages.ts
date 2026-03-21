import type { AtlassianClient } from "../../atlassian/client";
import {
  createPage as apiCreatePage,
  updatePage as apiUpdatePage,
  getPage,
} from "../api/pages";

export interface PageActionResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

export async function createConfluencePage(
  client: AtlassianClient,
  options: {
    spaceId: string;
    title: string;
    body: string;
    parentId?: string;
    siteUrl?: string;
  }
): Promise<PageActionResult> {
  try {
    const page = await apiCreatePage(client, {
      spaceId: options.spaceId,
      title: options.title,
      body: { representation: "storage", value: options.body },
      parentId: options.parentId,
      status: "current",
    });

    const url = page._links?.webui
      ? `${options.siteUrl ?? ""}/wiki${page._links.webui}`
      : undefined;

    return { success: true, pageId: page.id, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export async function updateConfluencePage(
  client: AtlassianClient,
  options: {
    pageId: string;
    title: string;
    body: string;
    versionMessage?: string;
    siteUrl?: string;
  }
): Promise<PageActionResult> {
  try {
    const current = await getPage(client, options.pageId);
    const currentVersion = current.version?.number ?? 1;

    const page = await apiUpdatePage(client, options.pageId, {
      id: options.pageId,
      title: options.title,
      body: { representation: "storage", value: options.body },
      version: {
        number: currentVersion + 1,
        message: options.versionMessage,
      },
      status: "current",
    });

    const url = page._links?.webui
      ? `${options.siteUrl ?? ""}/wiki${page._links.webui}`
      : undefined;

    return { success: true, pageId: page.id, url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}
