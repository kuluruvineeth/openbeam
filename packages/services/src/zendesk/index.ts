export type { TicketActionResult as ZendeskTicketActionResult } from "./actions";
export {
  addZendeskComment,
  createZendeskTicket,
  updateZendeskTicket,
} from "./actions";
export { buildUserLookup as buildZendeskUserLookup } from "./api";
export { ZendeskAuth } from "./auth";
export type { ZendeskClient, ZendeskClientConfig } from "./client";
export { createZendeskClient } from "./client";
export { zendeskFullSync } from "./sync/full";
export { zendeskIncrementalSync } from "./sync/incremental";
export type { ZendeskArticle } from "./transformers/article";
export { transformZendeskArticle } from "./transformers/article";
export type { ZendeskComment } from "./transformers/comment";
export { transformZendeskComment } from "./transformers/comment";
export type { ZendeskTicket } from "./transformers/ticket";
export { transformZendeskTicket } from "./transformers/ticket";
export { ZendeskApiError } from "./types";
