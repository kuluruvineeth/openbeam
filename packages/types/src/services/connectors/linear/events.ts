import { z } from "zod";
import {
  type ConnectorEventConfig,
  defineConnectorEvents,
} from "../common/events";

export const LINEAR_EVENT_IDS = [
  "issue.created",
  "issue.updated",
  "issue.removed",
  "comment.created",
  "comment.updated",
  "comment.removed",
  "project.created",
  "project.updated",
  "project.removed",
  "document.created",
  "document.updated",
  "document.removed",
] as const;

export type LinearEventId = (typeof LINEAR_EVENT_IDS)[number];

export const LINEAR_EVENTS = defineConnectorEvents<
  LinearEventId,
  readonly ConnectorEventConfig<LinearEventId>[]
>([
  {
    id: "issue.created",
    name: "Issue Created",
    description: "Triggered when a new issue is created",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "issue.updated",
    name: "Issue Updated",
    description: "Triggered when an issue is updated",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "issue.removed",
    name: "Issue Removed",
    description: "Triggered when an issue is deleted",
    category: "issues",
    isRealtime: true,
  },
  {
    id: "comment.created",
    name: "Comment Created",
    description: "Triggered when a comment is added to an issue",
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
    id: "comment.removed",
    name: "Comment Removed",
    description: "Triggered when a comment is deleted",
    category: "comments",
    isRealtime: true,
  },
  {
    id: "project.created",
    name: "Project Created",
    description: "Triggered when a new project is created",
    category: "projects",
    isRealtime: true,
  },
  {
    id: "project.updated",
    name: "Project Updated",
    description: "Triggered when a project is updated",
    category: "projects",
    isRealtime: true,
  },
  {
    id: "project.removed",
    name: "Project Removed",
    description: "Triggered when a project is deleted",
    category: "projects",
    isRealtime: true,
  },
  {
    id: "document.created",
    name: "Document Created",
    description: "Triggered when a new document is created",
    category: "documents",
    isRealtime: true,
  },
  {
    id: "document.updated",
    name: "Document Updated",
    description: "Triggered when a document is updated",
    category: "documents",
    isRealtime: true,
  },
  {
    id: "document.removed",
    name: "Document Removed",
    description: "Triggered when a document is deleted",
    category: "documents",
    isRealtime: true,
  },
]);

export const LinearEventIdSchema = z.enum(LINEAR_EVENT_IDS);
