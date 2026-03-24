import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BenchlingAssayResult } from "../api/assay-results";
import { buildBenchlingUrl, formatFieldsAsContent } from "./utils";

function buildAssayContent(result: BenchlingAssayResult): string {
  const parts: string[] = [];

  if (result.schema) {
    parts.push(`Schema: ${result.schema.name}`);
  }

  if (Object.keys(result.fields).length > 0) {
    parts.push(formatFieldsAsContent(result.fields));
  }

  if (result.entryId) {
    parts.push(`Entry ID: ${result.entryId}`);
  }

  return parts.join("\n");
}

export async function transformAssayResult(
  result: BenchlingAssayResult,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const schemaName = result.schema?.name ?? "Assay Result";
  const title = `${schemaName} - ${result.id}`;
  const content = buildAssayContent(result);
  const url = buildBenchlingUrl(context.tenant, `/results/${result.id}`);

  const metadata: GenericDocument["metadata"] = {
    ...(result.schema && { schema: result.schema.name }),
    ...(result.entryId && { entryId: result.entryId }),
    ...(result.projectId && { projectId: result.projectId }),
    fieldCount: String(Object.keys(result.fields).length),
    ...(result.archiveRecord && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_assay_${result.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: result.id,
    document_type: "document",
    document_subtype: "assay_result",
    title,
    content,
    created_at: new Date(result.createdAt).getTime(),
    updated_at: new Date(result.modifiedAt).getTime(),
    source_type: "benchling",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
