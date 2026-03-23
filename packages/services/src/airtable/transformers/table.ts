import type { AirtableTransformContext } from "@openbeam/types/services/connectors/airtable";
import type { GenericDocument } from "@openbeam/vespa";
import type { AirtableTable } from "../api/tables";
import { buildAirtableTableUrl } from "./utils";

type TableTransformMeta = {
  baseId: string;
  baseName: string;
};

export function transformAirtableTable(
  table: AirtableTable,
  context: AirtableTransformContext,
  meta: TableTransformMeta
): GenericDocument {
  const fieldDescriptions = table.fields
    .map((f) => {
      const desc = f.description ? ` — ${f.description}` : "";
      return `${f.name} (${f.type})${desc}`;
    })
    .join("\n");

  const viewList = table.views.map((v) => `${v.name} (${v.type})`).join(", ");

  const parts = [
    table.description ?? "",
    `Fields:\n${fieldDescriptions}`,
    viewList ? `Views: ${viewList}` : "",
  ].filter(Boolean);

  const content = parts.join("\n\n");

  return {
    id: `${context.connectorId}_table_${table.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: table.id,
    document_type: "spreadsheet",
    document_subtype: "table",
    title: `${table.name} — ${meta.baseName}`,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    url: buildAirtableTableUrl(meta.baseId, table.id),
    is_public: false,
    access_control: [],
    metadata: {
      baseId: meta.baseId,
      baseName: meta.baseName,
      fieldCount: String(table.fields.length),
      viewCount: String(table.views.length),
      primaryFieldId: table.primaryFieldId,
    },
  };
}
