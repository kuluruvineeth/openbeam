import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const GOOGLE_DRIVE_EVENT_IDS = [
  "file.created",
  "file.updated",
  "file.deleted",
  "file.trashed",
  "file.restored",
  "file.shared",
  "folder.created",
] as const;

export type GoogleDriveEventId = (typeof GOOGLE_DRIVE_EVENT_IDS)[number];

export const GOOGLE_DRIVE_EVENTS = defineConnectorEvents<
  GoogleDriveEventId,
  readonly ConnectorEventConfig<GoogleDriveEventId>[]
>([
  {
    id: "file.created",
    name: "File Created",
    description: "Triggered when a new file is created or uploaded",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.updated",
    name: "File Updated",
    description: "Triggered when a file is modified",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.deleted",
    name: "File Deleted",
    description: "Triggered when a file is permanently deleted",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.trashed",
    name: "File Trashed",
    description: "Triggered when a file is moved to trash",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.restored",
    name: "File Restored",
    description: "Triggered when a file is restored from trash",
    category: "files",
    isRealtime: true,
  },
  {
    id: "file.shared",
    name: "File Shared",
    description: "Triggered when a file's sharing permissions change",
    category: "files",
    isRealtime: true,
  },
  {
    id: "folder.created",
    name: "Folder Created",
    description: "Triggered when a new folder is created",
    category: "storage",
    isRealtime: true,
  },
]);

export const GoogleDriveEventIdSchema = z.enum(GOOGLE_DRIVE_EVENT_IDS);
