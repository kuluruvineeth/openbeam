import type { BenchlingTransformContext } from "@openbeam/types/services/connectors/benchling";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { BenchlingEntry } from "../api/entries";
import { formatFieldsAsContent } from "./utils";

function buildEntryContent(entry: BenchlingEntry): string {
  const parts: string[] = [];

  if (entry.fields && Object.keys(entry.fields).length > 0) {
    parts.push(formatFieldsAsContent(entry.fields));
  }

  if (entry.schema) {
    parts.push(`Schema: ${entry.schema.name}`);
  }

  if (entry.authors.length > 0) {
    parts.push(`Authors: ${entry.authors.map((a) => a.name).join(", ")}`);
  }

  if (entry.reviewRecord) {
    parts.push(`Review Status: ${entry.reviewRecord.status}`);
  }

  return parts.join("\n");
}

export async function transformEntry(
  entry: BenchlingEntry,
  context: BenchlingTransformContext
): Promise<GenericDocument> {
  const title = entry.name;
  const content = buildEntryContent(entry);
  const metadata: GenericDocument["metadata"] = {
    displayId: entry.displayId,
    folderId: entry.folderId,
    ...(entry.schema && { schema: entry.schema.name }),
    ...(entry.reviewRecord && { reviewStatus: entry.reviewRecord.status }),
    ...(entry.authors.length > 0 && {
      authors: entry.authors.map((a) => a.name).join(", "),
    }),
    ...(entry.archiveRecord && { archived: "true" }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_entry_${entry.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: entry.id,
    document_type: "document",
    document_subtype: "notebook_entry",
    title,
    content,
    created_at: new Date(entry.createdAt).getTime(),
    updated_at: new Date(entry.modifiedAt).getTime(),
    source_type: "benchling",
    url: entry.webURL,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: entry.authors[0]?.name,
  };
}
