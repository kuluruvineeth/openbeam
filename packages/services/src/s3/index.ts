export { type DeleteObjectResult, deleteObject } from "./actions/objects";
export type { S3Client } from "./client";
export { createS3Client } from "./client";
export { fullSync } from "./sync/full";
export { incrementalSync } from "./sync/incremental";
export { transformObject, transformObjects } from "./transformers/object";
export { S3ApiError } from "./types";
