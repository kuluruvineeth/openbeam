import type {
  NotionDatabase,
  NotionPage,
} from "@openbeam/types/services/connectors/notion";
import { search } from "../api/search";
import type { NotionClient } from "../client";
import {
  extractDatabaseTitle,
  extractPageTitle,
} from "../utils/content-extractor";

export interface DatabaseListResult {
  success: boolean;
  databases?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  error?: string;
}

export async function listDatabases(
  client: NotionClient,
  limit = 50
): Promise<DatabaseListResult> {
  try {
    const response = await search(client, {
      filter: { property: "object", value: "database" },
      pageSize: Math.min(limit, 100),
    });

    const databases = response.results
      .filter((r): r is NotionDatabase => r.object === "database")
      .map((db) => ({
        id: db.id,
        title: extractDatabaseTitle(db),
        url: db.url,
      }));

    return { success: true, databases };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to list databases",
    };
  }
}

export interface PageSearchResult {
  success: boolean;
  pages?: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  error?: string;
}

export async function searchPages(
  client: NotionClient,
  query: string,
  limit = 20
): Promise<PageSearchResult> {
  try {
    const response = await search(client, {
      query,
      filter: { property: "object", value: "page" },
      pageSize: Math.min(limit, 100),
    });

    const pages = response.results
      .filter((r): r is NotionPage => r.object === "page")
      .map((page) => ({
        id: page.id,
        title: extractPageTitle(page),
        url: page.url,
      }));

    return { success: true, pages };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search pages",
    };
  }
}
