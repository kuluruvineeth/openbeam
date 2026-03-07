import type {
  OmniverseTransformContext,
  ParsedPrim,
} from "@openbeam/types/services/connectors/omniverse";
import { OmniverseDocumentType } from "@openbeam/types/services/connectors/omniverse";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

export interface PrimTransformParams {
  stagePath: string;
}

const PRIM_TYPE_TO_DOC_TYPE: Record<string, string> = {
  Mesh: OmniverseDocumentType.ASSET,
  Xform: OmniverseDocumentType.ZONE,
  Scope: OmniverseDocumentType.ZONE,
  Camera: OmniverseDocumentType.SENSOR,
  Light: OmniverseDocumentType.SENSOR,
  Material: OmniverseDocumentType.MATERIAL,
  Shader: OmniverseDocumentType.MATERIAL,
  SkelRoot: OmniverseDocumentType.ASSET,
};

function classifyPrimType(typeName: string): string {
  return PRIM_TYPE_TO_DOC_TYPE[typeName] ?? OmniverseDocumentType.ASSET;
}

function buildPrimContent(
  prim: ParsedPrim,
  params: PrimTransformParams
): string {
  const parts: string[] = [];

  parts.push(`Type: ${prim.typeName}`);
  parts.push(`Path: ${prim.path}`);
  parts.push(`Stage: ${params.stagePath}`);
  parts.push(`Active: ${prim.isActive}`);

  if (prim.transform) {
    parts.push(`Position: (${prim.transform.translate.join(", ")})`);
    parts.push(`Scale: (${prim.transform.scale.join(", ")})`);
  }

  if (prim.assetInfo?.identifier) {
    parts.push(`Asset: ${prim.assetInfo.identifier}`);
  }

  if (prim.relationships.length > 0) {
    parts.push(`Relations: ${prim.relationships.length}`);
  }

  return parts.join("\n");
}

function buildPrimMetadata(
  prim: ParsedPrim,
  params: PrimTransformParams
): GenericDocument["metadata"] {
  return {
    primPath: prim.path,
    primType: prim.typeName,
    stagePath: params.stagePath,
    isActive: prim.isActive,
    ...(prim.parentPath && { parentPath: prim.parentPath }),
    ...(prim.transform && {
      translateX: prim.transform.translate[0],
      translateY: prim.transform.translate[1],
      translateZ: prim.transform.translate[2],
      scaleX: prim.transform.scale[0],
      scaleY: prim.transform.scale[1],
      scaleZ: prim.transform.scale[2],
    }),
    ...(prim.bounds && {
      boundsMinX: prim.bounds.min[0],
      boundsMinY: prim.bounds.min[1],
      boundsMinZ: prim.bounds.min[2],
      boundsMaxX: prim.bounds.max[0],
      boundsMaxY: prim.bounds.max[1],
      boundsMaxZ: prim.bounds.max[2],
    }),
    ...(prim.assetInfo?.identifier && {
      assetIdentifier: prim.assetInfo.identifier,
    }),
    ...(prim.assetInfo?.version && { assetVersion: prim.assetInfo.version }),
    relationshipCount: prim.relationships.length,
  };
}

function encodePrimId(path: string): string {
  return encodeURIComponent(path).replace(/%/g, "_");
}

export async function transformPrim(
  prim: ParsedPrim,
  context: OmniverseTransformContext,
  params: PrimTransformParams
): Promise<GenericDocument> {
  const title = prim.name;
  const content = buildPrimContent(prim, params);
  const metadata = buildPrimMetadata(prim, params);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const now = Date.now();

  return {
    id: `${context.connectorId}_prim_${encodePrimId(prim.path)}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: prim.path,
    document_type: classifyPrimType(prim.typeName),
    document_subtype: prim.typeName.toLowerCase(),
    title,
    content,
    parent_id: prim.parentPath
      ? `${context.connectorId}_prim_${encodePrimId(prim.parentPath)}`
      : undefined,
    created_at: now,
    updated_at: now,
    source_type: "omniverse",
    source_path: prim.path,
    url: `${context.nucleusUrl}${params.stagePath}#${prim.path}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformPrims(
  prims: ParsedPrim[],
  context: OmniverseTransformContext,
  params: PrimTransformParams
): Promise<GenericDocument[]> {
  return Promise.all(prims.map((prim) => transformPrim(prim, context, params)));
}
