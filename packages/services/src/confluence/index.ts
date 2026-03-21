export type {
  CommentActionResult as ConfluenceCommentActionResult,
  PageActionResult as ConfluencePageActionResult,
} from "./actions";
export {
  addConfluenceComment,
  createConfluencePage,
  updateConfluencePage,
} from "./actions";
export type {
  ConfluencePageResponse,
  ConfluenceSpace,
} from "./api";
export {
  createPage,
  createPageComment,
  getPage,
  getSpace,
  listSpaces,
  updatePage,
} from "./api";
export { ConfluenceAuth } from "./auth";
export { confluenceFullSync } from "./sync/full";
export { confluenceIncrementalSync } from "./sync/incremental";
export type {
  ConfluenceBlogpost,
  ConfluencePage,
  ConfluenceSpaceInfo,
} from "./transformers/page";
export { transformConfluencePage } from "./transformers/page";
