import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SimpplrFile } from "../api/files";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function buildFileContent(file: SimpplrFile): string {
  const parts: string[] = [file.title];

  if (file.description) {
    parts.push(file.description);
  }

  if (file.fileName) {
    parts.push(`File: ${file.fileName}`);
  }

  if (file.fileType) {
    parts.push(`Type: ${file.fileType}`);
  }

  if (file.fileSize !== undefined) {
    parts.push(`Size: ${formatFileSize(file.fileSize)}`);
  }

  if (file.author) {
    parts.push(`Author: ${file.author.displayName}`);
  }

  return parts.join("\n");
}

export async function transformFile(
  file: SimpplrFile,
  context: SimpplrTransformContext
): Promise<GenericDocument> {
  const title = file.title;
  const content = buildFileContent(file);
  const metadata: GenericDocument["metadata"] = {
    ...(file.fileName && { fileName: file.fileName }),
    ...(file.fileType && { fileType: file.fileType }),
    ...(file.fileSize !== undefined && { fileSize: String(file.fileSize) }),
    ...(file.author && { author: file.author.displayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_file_${file.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: file.id,
    document_type: "file",
    document_subtype: file.fileType,
    title,
    content,
    url: file.url ?? `${context.instanceUrl}/file/${file.id}`,
    created_at: new Date(file.createdAt).getTime(),
    updated_at: new Date(file.updatedAt).getTime(),
    source_type: "simpplr",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: file.author?.displayName,
    author_email: file.author?.email,
  };
}
