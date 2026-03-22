export type { CommentActionResult as FigmaCommentActionResult } from "./actions";
export { addComment as addFigmaComment } from "./actions";
export { getFileComments, getFileDetail, getTeamProjects } from "./api";
export { FigmaAuth } from "./auth";
export type { FigmaClient, FigmaClientConfig } from "./client";
export { createFigmaClient } from "./client";
export { figmaFullSync } from "./sync/full";
export { figmaIncrementalSync } from "./sync/incremental";
export { transformFigmaComment } from "./transformers/comment";
export {
  transformFigmaComponent,
  transformFigmaFile,
} from "./transformers/file";
export { FigmaApiError } from "./types";
