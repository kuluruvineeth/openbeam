import type { DatadogTransformContext } from "@openbeam/types/services/connectors/datadog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { DatadogSlo } from "../api/slos";
import { buildDatadogUrl, formatSloType } from "./utils";

function buildSloContent(slo: DatadogSlo): string {
  const parts: string[] = [];

  if (slo.description) {
    parts.push(slo.description);
  }

  parts.push(`Type: ${formatSloType(slo.type)}`);

  for (const threshold of slo.thresholds) {
    parts.push(
      `Target (${threshold.timeframe}): ${threshold.target_display}` +
        (threshold.warning_display
          ? ` (warning: ${threshold.warning_display})`
          : "")
    );
  }

  if (slo.query) {
    parts.push(`Numerator: ${slo.query.numerator}`);
    parts.push(`Denominator: ${slo.query.denominator}`);
  }

  if (slo.tags.length > 0) {
    parts.push(`Tags: ${slo.tags.join(", ")}`);
  }

  if (slo.creator.name ?? slo.creator.email) {
    parts.push(`Creator: ${slo.creator.name ?? slo.creator.email}`);
  }

  for (const status of slo.overall_status) {
    if (status.sli_value !== undefined) {
      parts.push(
        `SLI (${status.timeframe}): ${status.sli_value.toFixed(2)}% [${status.status}]`
      );
    }
  }

  return parts.join("\n");
}

function buildSloMetadata(slo: DatadogSlo): GenericDocument["metadata"] {
  return {
    sloId: slo.id,
    type: slo.type,
    typeLabel: formatSloType(slo.type),
    ...(slo.tags.length > 0 && { tags: slo.tags.join(", ") }),
    creator: slo.creator.name ?? slo.creator.email,
    ...(slo.thresholds.length > 0
      ? {
          primaryTarget: slo.thresholds[0]?.target_display,
          primaryTimeframe: slo.thresholds[0]?.timeframe,
        }
      : {}),
    ...(slo.monitor_ids &&
      slo.monitor_ids.length > 0 && {
        monitorCount: slo.monitor_ids.length,
      }),
  };
}

export async function transformSlo(
  slo: DatadogSlo,
  context: DatadogTransformContext
): Promise<GenericDocument> {
  const title = slo.name;
  const content = buildSloContent(slo);
  const metadata = buildSloMetadata(slo);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = slo.created_at * 1000;
  const updatedAt = slo.modified_at * 1000;

  return {
    id: `${context.connectorId}_slo_${slo.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: slo.id,
    document_type: "slo",
    document_subtype: slo.type,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "datadog",
    url: buildDatadogUrl(context.site, `/slo/manage?slo_id=${slo.id}`),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: slo.creator.name ?? slo.creator.email,
  };
}
