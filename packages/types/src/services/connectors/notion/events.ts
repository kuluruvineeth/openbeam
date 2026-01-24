import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const NOTION_EVENT_IDS = [
  "page.created",
  "page.updated",
  "page.content_updated",
  "page.deleted",
  "page.restored",
  "page.moved",
  "database.created",
  "database.updated",
  "database.deleted",
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "block.created",
  "block.updated",
] as const;

export type NotionEventId = (typeof NOTION_EVENT_IDS)[number];

export const NOTION_EVENTS = defineConnectorEvents<
  NotionEventId,
  readonly ConnectorEventConfig<NotionEventId>[]
>([
  {
    id: "page.created",
    name: "Page Created",
    description: "Triggered when a new page is created",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "page.updated",
    name: "Page Updated",
    description: "Triggered when page properties are updated",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "page.content_updated",
    name: "Page Content Updated",
    description: "Triggered when page content is modified",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "page.deleted",
    name: "Page Deleted",
    description: "Triggered when a page is deleted",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "page.restored",
    name: "Page Restored",
    description: "Triggered when a page is restored from trash",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "page.moved",
    name: "Page Moved",
    description: "Triggered when a page is moved to a different parent",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "database.created",
    name: "Database Created",
    description: "Triggered when a new database is created",
    category: "databases",
    isRealtime: true,
  },
  {
    id: "database.updated",
    name: "Database Updated",
    description: "Triggered when database properties are updated",
    category: "databases",
    isRealtime: true,
  },
  {
    id: "database.deleted",
    name: "Database Deleted",
    description: "Triggered when a database is deleted",
    category: "databases",
    isRealtime: true,
  },
  {
    id: "comment.created",
    name: "Comment Created",
    description: "Triggered when a comment is added",
    category: "comments",
    isRealtime: true,
  },
  {
    id: "comment.updated",
    name: "Comment Updated",
    description: "Triggered when a comment is edited",
    category: "comments",
    isRealtime: true,
  },
  {
    id: "comment.deleted",
    name: "Comment Deleted",
    description: "Triggered when a comment is deleted",
    category: "comments",
    isRealtime: true,
  },
  {
    id: "block.created",
    name: "Block Created",
    description: "Triggered when a new block is added to a page",
    category: "pages",
    isRealtime: true,
  },
  {
    id: "block.updated",
    name: "Block Updated",
    description: "Triggered when a block is modified",
    category: "pages",
    isRealtime: true,
  },
]);

export const NotionEventIdSchema = z.enum(NOTION_EVENT_IDS);
