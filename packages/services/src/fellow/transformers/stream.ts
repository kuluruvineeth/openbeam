import type { FellowTransformContext } from "@openbeam/types/services/connectors/fellow";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { FellowStream } from "../api/streams";

function buildStreamContent(stream: FellowStream): string {
  const parts: string[] = [];

  if (stream.description) {
    parts.push(stream.description);
  }

  return parts.join("\n");
}

export async function transformStream(
  stream: FellowStream,
  context: FellowTransformContext
): Promise<GenericDocument> {
  const title = stream.name;
  const content = buildStreamContent(stream);
  const metadata: GenericDocument["metadata"] = {};

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_stream_${stream.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: stream.id,
    document_type: "stream",
    document_subtype: "feed",
    title,
    content,
    created_at: new Date(stream.created_at).getTime(),
    updated_at: new Date(stream.updated_at).getTime(),
    source_type: "fellow",
    url: stream.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
