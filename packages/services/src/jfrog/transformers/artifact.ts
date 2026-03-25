import type { JFrogTransformContext } from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JFrogArtifact } from "../api/artifacts";
import { buildJFrogArtifactUrl, formatFileSize } from "./utils";

function buildArtifactContent(artifact: JFrogArtifact): string {
  const parts: string[] = [];
  const fullPath =
    artifact.path === "." ? artifact.name : `${artifact.path}/${artifact.name}`;

  parts.push(`Path: ${artifact.repo}/${fullPath}`);
  parts.push(`Size: ${formatFileSize(artifact.size)}`);
  parts.push(`Type: ${artifact.type}`);

  if (artifact.mimeType) {
    parts.push(`MIME: ${artifact.mimeType}`);
  }

  if (artifact.createdBy) {
    parts.push(`Created by: ${artifact.createdBy}`);
  }

  if (artifact.modifiedBy) {
    parts.push(`Modified by: ${artifact.modifiedBy}`);
  }

  if (artifact.actualSha1) {
    parts.push(`SHA1: ${artifact.actualSha1}`);
  }

  if (artifact.sha256) {
    parts.push(`SHA256: ${artifact.sha256}`);
  }

  if (artifact.properties) {
    const propEntries = Object.entries(artifact.properties);
    if (propEntries.length > 0) {
      parts.push(
        propEntries.map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n")
      );
    }
  }

  return parts.join("\n");
}

function buildArtifactMetadata(
  artifact: JFrogArtifact
): GenericDocument["metadata"] {
  return {
    repo: artifact.repo,
    path: artifact.path,
    fileName: artifact.name,
    fileType: artifact.type,
    size: artifact.size,
    sizeFormatted: formatFileSize(artifact.size),
    ...(artifact.mimeType && { mimeType: artifact.mimeType }),
    ...(artifact.createdBy && { createdBy: artifact.createdBy }),
    ...(artifact.modifiedBy && { modifiedBy: artifact.modifiedBy }),
    ...(artifact.actualSha1 && { sha1: artifact.actualSha1 }),
    ...(artifact.sha256 && { sha256: artifact.sha256 }),
  };
}

export async function transformArtifact(
  artifact: JFrogArtifact,
  context: JFrogTransformContext
): Promise<GenericDocument> {
  const fullPath =
    artifact.path === "." ? artifact.name : `${artifact.path}/${artifact.name}`;
  const uniqueKey = `${artifact.repo}/${fullPath}`;
  const title = `${artifact.repo}/${fullPath}`;
  const content = buildArtifactContent(artifact);
  const metadata = buildArtifactMetadata(artifact);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(artifact.created).getTime();
  const updatedAt = new Date(artifact.modified).getTime();

  return {
    id: `${context.connectorId}_artifact_${Buffer.from(uniqueKey).toString("base64url")}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: uniqueKey,
    document_type: "artifact",
    document_subtype: artifact.type,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "jfrog",
    url: buildJFrogArtifactUrl(
      context.instanceUrl,
      artifact.repo,
      artifact.path,
      artifact.name
    ),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: artifact.createdBy,
  };
}
