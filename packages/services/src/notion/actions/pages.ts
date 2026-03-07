import type { NotionPage } from "@openbeam/types/services/connectors/notion";
import {
  archivePage as apiArchivePage,
  createPage as apiCreatePage,
  getPage as apiGetPage,
  restorePage as apiRestorePage,
  updatePage as apiUpdatePage,
} from "../api/pages";
import type { NotionClient } from "../client";
import { createTextRichText } from "../utils/rich-text";

export interface PageActionResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
}

export interface CreatePageOptions {
  parentId: string;
  parentType: "page" | "database";
  title: string;
  content?: string;
  properties?: Record<string, unknown>;
  icon?: { type: "emoji"; emoji: string };
  cover?: { type: "external"; external: { url: string } };
}

function contentToBlocks(content: string): unknown[] {
  return content.split("\n").map((line) => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: createTextRichText(line),
    },
  }));
}

export async function createPage(
  client: NotionClient,
  options: CreatePageOptions
): Promise<PageActionResult> {
  try {
    const parent =
      options.parentType === "page"
        ? { type: "page_id" as const, page_id: options.parentId }
        : { type: "database_id" as const, database_id: options.parentId };

    const properties: Record<string, unknown> =
      options.parentType === "database"
        ? {
            ...options.properties,
            title: { title: createTextRichText(options.title) },
          }
        : { title: { title: createTextRichText(options.title) } };

    const children = options.content
      ? contentToBlocks(options.content)
      : undefined;

    const page = await apiCreatePage(client, {
      parent,
      properties,
      children,
      icon: options.icon,
      cover: options.cover,
    });

    return {
      success: true,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create page",
    };
  }
}

export interface UpdatePageOptions {
  properties?: Record<string, unknown>;
  icon?: { type: "emoji"; emoji: string } | null;
  cover?: { type: "external"; external: { url: string } } | null;
}

export async function updatePage(
  client: NotionClient,
  pageId: string,
  options: UpdatePageOptions
): Promise<PageActionResult> {
  try {
    const page = await apiUpdatePage(client, pageId, {
      properties: options.properties,
      icon: options.icon,
      cover: options.cover,
    });

    return {
      success: true,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update page",
    };
  }
}

export async function archivePage(
  client: NotionClient,
  pageId: string
): Promise<PageActionResult> {
  try {
    const page = await apiArchivePage(client, pageId);

    return {
      success: true,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive page",
    };
  }
}

export async function restorePage(
  client: NotionClient,
  pageId: string
): Promise<PageActionResult> {
  try {
    const page = await apiRestorePage(client, pageId);

    return {
      success: true,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to restore page",
    };
  }
}

export async function getPage(
  client: NotionClient,
  pageId: string
): Promise<NotionPage | null> {
  try {
    return await apiGetPage(client, pageId);
  } catch {
    return null;
  }
}
