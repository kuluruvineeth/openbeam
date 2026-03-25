import type { LoopioTransformContext } from "@openbeam/types/services/connectors/loopio";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { LoopioLibraryEntry } from "../api/library-entries";
import { stripHtml } from "./utils";

function buildLibraryEntryContent(entry: LoopioLibraryEntry): string {
  const parts: string[] = [];

  parts.push(`Q: ${stripHtml(entry.question)}`);
  parts.push(`A: ${stripHtml(entry.answer)}`);

  if (entry.category) {
    parts.push(`Category: ${entry.category}`);
  }

  if (entry.tags.length > 0) {
    parts.push(`Tags: ${entry.tags.join(", ")}`);
  }

  if (entry.last_reviewed_at) {
    parts.push(`Last Reviewed: ${entry.last_reviewed_at}`);
  }

  if (entry.reviewed_by) {
    parts.push(`Reviewed By: ${entry.reviewed_by.name}`);
  }

  return parts.join("\n");
}

export async function transformLibraryEntry(
  entry: LoopioLibraryEntry,
  context: LoopioTransformContext
): Promise<GenericDocument> {
  const title = stripHtml(entry.question);
  const content = buildLibraryEntryContent(entry);
  const metadata: GenericDocument["metadata"] = {
    category: entry.category,
    ...(entry.tags.length > 0 && {
      tags: entry.tags.join(", "),
    }),
    ...(entry.last_reviewed_at && {
      lastReviewed: entry.last_reviewed_at,
    }),
    ...(entry.reviewed_by && {
      reviewedBy: entry.reviewed_by.name,
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_library_entry_${entry.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: entry.id,
    document_type: "library_entry",
    document_subtype: entry.category,
    title,
    content,
    created_at: new Date(entry.created_at).getTime(),
    updated_at: new Date(entry.updated_at).getTime(),
    source_type: "loopio",
    url: `https://app.loopio.com/library/${entry.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: entry.reviewed_by?.name,
    author_email: entry.reviewed_by?.email,
  };
}
