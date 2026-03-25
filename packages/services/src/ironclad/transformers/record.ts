import type { IroncladTransformContext } from "@openbeam/types/services/connectors/ironclad";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { IroncladRecord } from "../api/records";
import { flattenAttributes } from "./utils";

function buildRecordContent(record: IroncladRecord): string {
  const parts: string[] = [];

  parts.push(`Type: ${record.type}`);
  parts.push(`Status: ${record.status}`);

  if (record.counterpartyName) {
    parts.push(`Counterparty: ${record.counterpartyName}`);
  }

  const propsText = flattenAttributes(record.properties);
  if (propsText) {
    parts.push(propsText);
  }

  return parts.join("\n");
}

export async function transformRecord(
  record: IroncladRecord,
  context: IroncladTransformContext
): Promise<GenericDocument> {
  const title = record.name || `Record ${record.id}`;
  const content = buildRecordContent(record);

  const metadata: GenericDocument["metadata"] = {
    recordType: record.type,
    status: record.status,
    ...(record.counterpartyName && { counterparty: record.counterpartyName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_record_${record.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: record.id,
    document_type: "record",
    document_subtype: record.type,
    title,
    content,
    created_at: new Date(record.created).getTime(),
    updated_at: new Date(record.lastUpdated).getTime(),
    source_type: "ironclad",
    url: `https://ironcladapp.com/records/${record.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
