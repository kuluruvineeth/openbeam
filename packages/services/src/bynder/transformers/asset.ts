import type { BynderTransformContext } from "@openbeam/types/services/connectors/bynder";
import type { GenericDocument } from "@openbeam/vespa";
import type { BynderAsset } from "../client";

function getAssetDocumentType(asset: BynderAsset): string {
  const type = (asset.type ?? "").toLowerCase();
  if (type === "image") {
    return "image";
  }
  if (type === "video") {
    return "video";
  }
  if (type === "document") {
    return "document";
  }
  return "asset";
}

function buildAssetUrl(domain: string, assetId: string): string {
  return `https://${domain}.bynder.com/media/?mediaId=${assetId}`;
}

function buildContent(asset: BynderAsset): string {
  const parts = [asset.name];
  if (asset.description) {
    parts.push(asset.description);
  }
  if (asset.tags.length > 0) {
    parts.push(asset.tags.join(", "));
  }
  if (asset.copyright) {
    parts.push(asset.copyright);
  }
  return parts.join(" ");
}

export function transformBynderAsset(
  asset: BynderAsset,
  context: BynderTransformContext
): GenericDocument {
  const createdAt = new Date(asset.dateCreated).getTime();
  const updatedAt = new Date(asset.dateModified).getTime();
  const extensions = asset.extension ?? [];

  return {
    id: `${context.connectorId}_asset_${asset.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: asset.id,
    document_type: getAssetDocumentType(asset),
    document_subtype: asset.type?.toLowerCase() ?? "asset",
    title: asset.name,
    content: buildContent(asset),
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildAssetUrl(context.domain, asset.id),
    is_public: asset.isPublic === 1,
    access_control: [],
    metadata: {
      ...(asset.type && { assetType: asset.type }),
      ...(asset.brandId && { brandId: asset.brandId }),
      ...(extensions.length > 0 && { extensions: extensions.join(", ") }),
      ...(asset.fileSize > 0 && { fileSize: asset.fileSize }),
      ...(asset.width > 0 && { width: asset.width }),
      ...(asset.height > 0 && { height: asset.height }),
      ...(asset.orientation && { orientation: asset.orientation }),
      ...(asset.tags.length > 0 && { tags: asset.tags.join(", ") }),
      ...(asset.copyright && { copyright: asset.copyright }),
      ...(asset.archive === 1 && { archived: true }),
    },
  };
}
