import type { AmplitudeTransformContext } from "@openbeam/types/services/connectors/amplitude";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AmplitudeChart } from "../api/charts";
import { buildAmplitudeChartUrl, formatChartType } from "./utils";

function buildChartContent(chart: AmplitudeChart): string {
  const parts: string[] = [];

  if (chart.description) {
    parts.push(chart.description);
  }

  parts.push(`Chart Type: ${formatChartType(chart.chartType)}`);

  if (chart.owner) {
    parts.push(`Creator: ${chart.owner}`);
  }

  if (chart.isPublic !== undefined) {
    parts.push(`Sharing: ${chart.isPublic ? "Public" : "Private"}`);
  }

  if (chart.projectId) {
    parts.push(`Project ID: ${chart.projectId}`);
  }

  return parts.join("\n");
}

function buildChartMetadata(
  chart: AmplitudeChart
): GenericDocument["metadata"] {
  return {
    chartId: String(chart.id),
    chartType: chart.chartType,
    chartTypeLabel: formatChartType(chart.chartType),
    ...(chart.owner && { owner: chart.owner }),
    ...(chart.isPublic !== undefined && { isPublic: chart.isPublic }),
    ...(chart.projectId && { projectId: String(chart.projectId) }),
  };
}

export async function transformChart(
  chart: AmplitudeChart,
  context: AmplitudeTransformContext
): Promise<GenericDocument> {
  const title = chart.name;
  const content = buildChartContent(chart);
  const metadata = buildChartMetadata(chart);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = chart.createdAt
    ? new Date(chart.createdAt).getTime()
    : Date.now();
  const updatedAt = chart.lastModified
    ? new Date(chart.lastModified).getTime()
    : createdAt;

  return {
    id: `${context.connectorId}_chart_${chart.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(chart.id),
    document_type: "chart",
    document_subtype: chart.chartType,
    title,
    content,
    created_at: createdAt,
    updated_at: updatedAt,
    source_type: "amplitude",
    url: buildAmplitudeChartUrl(context.orgSlug, chart.id),
    is_public: chart.isPublic ?? false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: chart.owner,
  };
}
