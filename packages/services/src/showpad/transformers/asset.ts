import type { ShowpadTransformContext } from "@openbeam/types/services/connectors/showpad";
import type { GenericDocument } from "@openbeam/vespa";
import type { ShowpadAsset } from "../client";

function getAssetDocumentType(resourcetype: string): string {
  const type = resourcetype.toLowerCase();
  if (type.includes("video")) {
    return "file";
  }
  if (type.includes("image") || type.includes("photo")) {
    return "image";
  }
  if (type.includes("presentation") || type.includes("ppt")) {
    return "presentation";
  }
  if (type.includes("spreadsheet") || type.includes("xls")) {
    return "spreadsheet";
  }
  return "document";
}

function buildAssetUrl(subdomain: string, assetId: string): string {
  return `https://${subdomain}.showpad.biz/#!/asset/${assetId}`;
}

function buildContent(asset: ShowpadAsset): string {
  const parts = [asset.name];
  if (asset.description) {
    parts.push(asset.description);
  }
  if (asset.tags.length > 0) {
    parts.push(asset.tags.map((t) => t.name).join(", "));
  }
  if (asset.channels.length > 0) {
    parts.push(asset.channels.map((c) => c.name).join(", "));
  }
  return parts.join(" ");
}

export function transformShowpadAsset(
  asset: ShowpadAsset,
  context: ShowpadTransformContext
): GenericDocument {
  const createdAt = new Date(asset.createdAt).getTime();
  const updatedAt = new Date(asset.updatedAt).getTime();
  const tagNames = asset.tags.map((t) => t.name);
  const channelNames = asset.channels.map((c) => c.name);

  return {
    id: `${context.connectorId}_asset_${asset.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: asset.id,
    document_type: getAssetDocumentType(asset.resourcetype),
    document_subtype: asset.resourcetype?.toLowerCase() ?? "asset",
    title: asset.name,
    content: buildContent(asset),
    created_at: createdAt,
    updated_at: updatedAt,
    url: buildAssetUrl(context.subdomain, asset.id),
    is_public: false,
    access_control: [],
    metadata: {
      ...(asset.resourcetype && { resourceType: asset.resourcetype }),
      ...(asset.slug && { slug: asset.slug }),
      ...(tagNames.length > 0 && { tags: tagNames.join(", ") }),
      ...(channelNames.length > 0 && { channels: channelNames.join(", ") }),
      ...(asset.expiresAt && { expiresAt: asset.expiresAt }),
      ...(asset.isSensitive && { sensitive: true }),
      ...(asset.isShareable && { shareable: true }),
    },
  };
}
