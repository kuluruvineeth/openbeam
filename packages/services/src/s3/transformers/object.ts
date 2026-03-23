import type { S3TransformContext } from "@openbeam/types/services/connectors/s3";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { S3Object } from "../client";

const BYTES_PER_MB = 1_048_576;
const BYTES_PER_GB = 1_073_741_824;
const BYTES_PER_KB = 1024;

function formatFileSize(bytes: number): string {
  if (bytes >= BYTES_PER_GB) {
    return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  }
  if (bytes >= BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  }
  if (bytes >= BYTES_PER_KB) {
    return `${(bytes / BYTES_PER_KB).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

function getFileExtension(key: string): string {
  const lastDot = key.lastIndexOf(".");
  if (lastDot === -1 || lastDot === key.length - 1) {
    return "";
  }
  return key.slice(lastDot + 1).toLowerCase();
}

function getFileName(key: string): string {
  const lastSlash = key.lastIndexOf("/");
  return lastSlash === -1 ? key : key.slice(lastSlash + 1);
}

function getParentPrefix(key: string): string {
  const lastSlash = key.lastIndexOf("/");
  return lastSlash === -1 ? "" : key.slice(0, lastSlash + 1);
}

function buildObjectContent(obj: S3Object): string {
  const parts: string[] = [];
  parts.push(`Path: ${obj.key}`);
  parts.push(`Size: ${formatFileSize(obj.size)}`);
  parts.push(`Storage Class: ${obj.storageClass}`);

  const ext = getFileExtension(obj.key);
  if (ext) {
    parts.push(`Type: ${ext.toUpperCase()}`);
  }

  const parent = getParentPrefix(obj.key);
  if (parent) {
    parts.push(`Folder: ${parent}`);
  }

  return parts.join("\n");
}

function buildObjectMetadata(
  obj: S3Object,
  ctx: S3TransformContext
): GenericDocument["metadata"] {
  const ext = getFileExtension(obj.key);
  return {
    key: obj.key,
    fileName: getFileName(obj.key),
    ...(ext && { fileExtension: ext }),
    sizeBytes: obj.size,
    sizeFormatted: formatFileSize(obj.size),
    storageClass: obj.storageClass,
    etag: obj.etag,
    bucket: ctx.bucketName,
    region: ctx.region,
    prefix: getParentPrefix(obj.key),
  };
}

export async function transformObject(
  obj: S3Object,
  ctx: S3TransformContext
): Promise<GenericDocument> {
  const title = getFileName(obj.key);
  const content = buildObjectContent(obj);
  const metadata = buildObjectMetadata(obj, ctx);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const updatedAt = new Date(obj.lastModified).getTime();
  const consoleUrl = `https://s3.console.aws.amazon.com/s3/object/${encodeURIComponent(ctx.bucketName)}?region=${ctx.region}&prefix=${encodeURIComponent(obj.key)}`;

  return {
    id: `${ctx.connectorId}_object_${obj.key}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: obj.key,
    document_type: "file",
    document_subtype: getFileExtension(obj.key) || "unknown",
    title,
    content,
    created_at: updatedAt,
    updated_at: updatedAt,
    source_type: "s3",
    url: consoleUrl,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    metadata,
    checksum,
  };
}

export function transformObjects(
  items: S3Object[],
  ctx: S3TransformContext
): Promise<GenericDocument[]> {
  return Promise.all(items.map((item) => transformObject(item, ctx)));
}
