import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BenchlingFolder } from "../api/folders";

export async function transformFolder(
  folder: BenchlingFolder,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const title = folder.name;
  const parts: string[] = [`Folder: ${folder.name}`];
  if (folder.projectId) {
    parts.push(`Project ID: ${folder.projectId}`);
  }
  if (folder.parentFolderId) {
    parts.push(`Parent Folder ID: ${folder.parentFolderId}`);
  }
  const content = parts.join("\n");

  const metadata: GenericDocument["metadata"] = {
    ...(folder.projectId && { projectId: folder.projectId }),
    ...(folder.parentFolderId && { parentFolderId: folder.parentFolderId }),
    ...(folder.archiveRecord && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_folder_${folder.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: folder.id,
    document_type: "document",
    document_subtype: "folder",
    title,
    content,
    created_at: new Date(folder.createdAt).getTime(),
    updated_at: new Date(folder.modifiedAt).getTime(),
    source_type: "benchling",
    url: folder.webURL,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
