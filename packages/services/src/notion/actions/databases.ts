import {
  getDatabase as apiGetDatabase,
  queryDatabase as apiQueryDatabase,
  queryDatabaseAll,
} from "../api/databases";
import { createPage as apiCreatePage } from "../api/pages";
import type { NotionClient } from "../client";
import type { NotionDatabase, NotionPage } from "../types";
import { createTextRichText } from "../utils/rich-text";

export interface DatabaseActionResult {
  success: boolean;
  databaseId?: string;
  pageId?: string;
  url?: string;
  error?: string;
}

export interface CreateDatabaseEntryOptions {
  properties: Record<string, unknown>;
}

export async function createDatabaseEntry(
  client: NotionClient,
  databaseId: string,
  properties: Record<string, unknown>
): Promise<DatabaseActionResult> {
  try {
    const page = await apiCreatePage(client, {
      parent: { type: "database_id", database_id: databaseId },
      properties,
    });

    return {
      success: true,
      databaseId,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create database entry",
    };
  }
}

export async function createDatabaseEntryWithTitle(
  client: NotionClient,
  databaseId: string,
  title: string,
  additionalProperties?: Record<string, unknown>
): Promise<DatabaseActionResult> {
  const properties = {
    ...additionalProperties,
    title: { title: createTextRichText(title) },
  };

  return await createDatabaseEntry(client, databaseId, properties);
}

export interface UpdateDatabaseEntryOptions {
  properties: Record<string, unknown>;
}

export async function updateDatabaseEntry(
  client: NotionClient,
  pageId: string,
  properties: Record<string, unknown>
): Promise<DatabaseActionResult> {
  try {
    const { updatePage } = await import("../api/pages");
    const page = await updatePage(client, pageId, { properties });

    return {
      success: true,
      pageId: page.id,
      url: page.url,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update database entry",
    };
  }
}

export interface QueryDatabaseOptions {
  filter?: {
    property?: string;
    [key: string]: unknown;
  };
  sorts?: Array<{
    property?: string;
    timestamp?: "created_time" | "last_edited_time";
    direction: "ascending" | "descending";
  }>;
  pageSize?: number;
}

export async function queryDatabase(
  client: NotionClient,
  databaseId: string,
  options?: QueryDatabaseOptions
): Promise<NotionPage[]> {
  try {
    const response = await apiQueryDatabase(client, databaseId, {
      filter: options?.filter,
      sorts: options?.sorts,
      pageSize: options?.pageSize,
    });

    return response.results;
  } catch {
    return [];
  }
}

export async function queryDatabaseFullResults(
  client: NotionClient,
  databaseId: string,
  options?: Omit<QueryDatabaseOptions, "pageSize">
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];

  try {
    for await (const page of queryDatabaseAll(client, databaseId, {
      filter: options?.filter,
      sorts: options?.sorts,
    })) {
      pages.push(page);
    }
  } catch {
    return pages;
  }

  return pages;
}

export async function getDatabaseSchema(
  client: NotionClient,
  databaseId: string
): Promise<NotionDatabase | null> {
  try {
    return await apiGetDatabase(client, databaseId);
  } catch {
    return null;
  }
}

export async function getDatabasePropertyNames(
  client: NotionClient,
  databaseId: string
): Promise<string[]> {
  const database = await getDatabaseSchema(client, databaseId);
  if (!database) {
    return [];
  }

  return Object.keys(database.properties);
}
