import type { NotionPage } from "@openplane/types/services/connectors/notion";
import type { NotionClient } from "../client";

export async function getPage(
  client: NotionClient,
  pageId: string
): Promise<NotionPage> {
  return await client.get<NotionPage>(`/pages/${pageId}`);
}

export async function getPageProperty(
  client: NotionClient,
  pageId: string,
  propertyId: string
): Promise<unknown> {
  return await client.get(`/pages/${pageId}/properties/${propertyId}`);
}

export interface CreatePageOptions {
  parent:
    | { type: "page_id"; page_id: string }
    | { type: "database_id"; database_id: string };
  properties: Record<string, unknown>;
  children?: unknown[];
  icon?:
    | { type: "emoji"; emoji: string }
    | { type: "external"; external: { url: string } };
  cover?: { type: "external"; external: { url: string } };
}

export async function createPage(
  client: NotionClient,
  options: CreatePageOptions
): Promise<NotionPage> {
  const body: Record<string, unknown> = {
    parent: options.parent,
    properties: options.properties,
  };

  if (options.children) {
    body.children = options.children;
  }
  if (options.icon) {
    body.icon = options.icon;
  }
  if (options.cover) {
    body.cover = options.cover;
  }

  return await client.post<NotionPage>("/pages", body);
}

export interface UpdatePageOptions {
  properties?: Record<string, unknown>;
  icon?:
    | { type: "emoji"; emoji: string }
    | { type: "external"; external: { url: string } }
    | null;
  cover?: { type: "external"; external: { url: string } } | null;
  archived?: boolean;
  in_trash?: boolean;
}

export async function updatePage(
  client: NotionClient,
  pageId: string,
  options: UpdatePageOptions
): Promise<NotionPage> {
  const body: Record<string, unknown> = {};

  if (options.properties !== undefined) {
    body.properties = options.properties;
  }
  if (options.icon !== undefined) {
    body.icon = options.icon;
  }
  if (options.cover !== undefined) {
    body.cover = options.cover;
  }
  if (options.archived !== undefined) {
    body.archived = options.archived;
  }
  if (options.in_trash !== undefined) {
    body.in_trash = options.in_trash;
  }

  return await client.patch<NotionPage>(`/pages/${pageId}`, body);
}

export async function archivePage(
  client: NotionClient,
  pageId: string
): Promise<NotionPage> {
  return await updatePage(client, pageId, { archived: true });
}

export async function restorePage(
  client: NotionClient,
  pageId: string
): Promise<NotionPage> {
  return await updatePage(client, pageId, { archived: false });
}

export async function trashPage(
  client: NotionClient,
  pageId: string
): Promise<NotionPage> {
  return await updatePage(client, pageId, { in_trash: true });
}
