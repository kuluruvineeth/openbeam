import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type {
  BenchlingAaSequence,
  BenchlingDnaSequence,
} from "../api/sequences";

function buildDnaContent(seq: BenchlingDnaSequence): string {
  const parts: string[] = [
    `DNA Sequence: ${seq.name}`,
    `Length: ${seq.length} bp`,
    `Circular: ${seq.isCircular}`,
  ];

  if (seq.annotations.length > 0) {
    const annotationNames = seq.annotations
      .map((a) => `${a.name} (${a.type})`)
      .join(", ");
    parts.push(`Annotations: ${annotationNames}`);
  }

  if (seq.schema) {
    parts.push(`Schema: ${seq.schema.name}`);
  }

  if (seq.entityRegistryId) {
    parts.push(`Registry ID: ${seq.entityRegistryId}`);
  }

  return parts.join("\n");
}

function buildAaContent(seq: BenchlingAaSequence): string {
  const parts: string[] = [
    `Protein Sequence: ${seq.name}`,
    `Length: ${seq.length} aa`,
  ];

  if (seq.annotations.length > 0) {
    const annotationNames = seq.annotations
      .map((a) => `${a.name} (${a.type})`)
      .join(", ");
    parts.push(`Annotations: ${annotationNames}`);
  }

  if (seq.schema) {
    parts.push(`Schema: ${seq.schema.name}`);
  }

  if (seq.entityRegistryId) {
    parts.push(`Registry ID: ${seq.entityRegistryId}`);
  }

  return parts.join("\n");
}

export async function transformDnaSequence(
  seq: BenchlingDnaSequence,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const title = seq.name;
  const content = buildDnaContent(seq);
  const metadata: GenericDocument["metadata"] = {
    sequenceType: "dna",
    length: String(seq.length),
    isCircular: seq.isCircular,
    annotationCount: String(seq.annotations.length),
    ...(seq.schema && { schema: seq.schema.name }),
    ...(seq.folderId && { folderId: seq.folderId }),
    ...(seq.entityRegistryId && { registryId: seq.entityRegistryId }),
    ...(seq.archiveRecord && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_dna_${seq.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: seq.id,
    document_type: "document",
    document_subtype: "dna_sequence",
    title,
    content,
    created_at: new Date(seq.createdAt).getTime(),
    updated_at: new Date(seq.modifiedAt).getTime(),
    source_type: "benchling",
    url: seq.webURL,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export async function transformAaSequence(
  seq: BenchlingAaSequence,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const title = seq.name;
  const content = buildAaContent(seq);
  const metadata: GenericDocument["metadata"] = {
    sequenceType: "protein",
    length: String(seq.length),
    annotationCount: String(seq.annotations.length),
    ...(seq.schema && { schema: seq.schema.name }),
    ...(seq.folderId && { folderId: seq.folderId }),
    ...(seq.entityRegistryId && { registryId: seq.entityRegistryId }),
    ...(seq.archiveRecord && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_aa_${seq.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: seq.id,
    document_type: "document",
    document_subtype: "protein_sequence",
    title,
    content,
    created_at: new Date(seq.createdAt).getTime(),
    updated_at: new Date(seq.modifiedAt).getTime(),
    source_type: "benchling",
    url: seq.webURL,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
