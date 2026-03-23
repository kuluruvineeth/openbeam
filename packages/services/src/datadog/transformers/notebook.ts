import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogNotebook } from "../api/notebooks";
import { buildDatadogUrl } from "./utils";

function extractNotebookText(notebook: DatadogNotebook): string {
  const parts: string[] = [];

  for (const cell of notebook.attributes.cells) {
    if (cell.attributes.definition.text) {
      parts.push(cell.attributes.definition.text);
    }
  }

  return parts.join("\n\n");
}

function buildNotebookContent(notebook: DatadogNotebook): string {
  const attrs = notebook.attributes;
  const parts: string[] = [];

  const cellText = extractNotebookText(notebook);
  if (cellText) {
    parts.push(cellText);
  }

  const author = attrs.author.name ?? attrs.author.handle;
  parts.push(`Author: ${author}`);
  parts.push(`Cells: ${attrs.cells.length}`);
  parts.push(`Status: ${attrs.status}`);

  return parts.join("\n");
}

function buildNotebookMetadata(
  notebook: DatadogNotebook
): GenericDocument["metadata"] {
  const attrs = notebook.attributes;
  return {
    notebookId: notebook.id,
    author: attrs.author.name ?? attrs.author.handle,
    cellCount: attrs.cells.length,
    status: attrs.status,
    ...(attrs.metadata?.type && { notebookType: attrs.metadata.type }),
  };
}

export async function transformNotebook(
  notebook: DatadogNotebook,
  context: DatadogTransformContext
): Promise<GenericDocument> {
  const title = notebook.attributes.name;
  const content = buildNotebookContent(notebook);
  const metadata = buildNotebookMetadata(notebook);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(notebook.attributes.created).getTime();
  const updatedAt = new Date(notebook.attributes.modified).getTime();
  const authorName =
    notebook.attributes.author.name ?? notebook.attributes.author.handle;

  return {
    id: `${context.connectorId}_notebook_${notebook.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(notebook.id),
    document_type: "notebook",
    document_subtype: "notebook",
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(context.site, `/notebook/${notebook.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: authorName,
  };
}
