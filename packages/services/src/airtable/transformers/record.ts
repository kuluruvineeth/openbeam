import type { AirtableTransformContext } from "@openbeam/types/services/connectors/airtable";
import type { GenericDocument } from "@openbeam/vespa";
import type { AirtableRecord } from "../api/records";
import { buildAirtableRecordUrl, fieldValueToString } from "./utils";

type RecordTransformMeta = {
  baseId: string;
  baseName: string;
  tableId: string;
  tableName: string;
};

export function transformAirtableRecord(
  record: AirtableRecord,
  context: AirtableTransformContext,
  meta: RecordTransformMeta
): GenericDocument {
  const fieldEntries = Object.entries(record.fields);
  const parts: string[] = [];
  const metadataFields: Record<string, string> = {};

  for (const [key, value] of fieldEntries) {
    const stringVal = fieldValueToString(value);
    if (stringVal) {
      parts.push(`${key}: ${stringVal}`);
      metadataFields[key] = stringVal;
    }
  }

  const content = parts.join("\n");
  const firstField = fieldEntries[0];
  const title = firstField
    ? fieldValueToString(firstField[1]) || `Record ${record.id}`
    : `Record ${record.id}`;

  const createdAt = new Date(record.createdTime).getTime();

  return {
    id: `${context.connectorId}_record_${record.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: record.id,
    document_type: "record",
    document_subtype: meta.tableName,
    title,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    url: buildAirtableRecordUrl(meta.baseId, meta.tableId, record.id),
    is_public: false,
    access_control: [],
    metadata: {
      baseId: meta.baseId,
      baseName: meta.baseName,
      tableId: meta.tableId,
      tableName: meta.tableName,
      ...Object.fromEntries(
        Object.entries(metadataFields)
          .slice(0, 20)
          .map(([k, v]) => [k, v])
      ),
    },
  };
}
