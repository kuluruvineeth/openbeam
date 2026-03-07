import type {
  FhirDeviceMetric,
  FhirTransformContext,
} from "@openbeam/types/services/connectors/fhir";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import { buildAccessControl } from "../phi/consent";

function getMetricName(metric: FhirDeviceMetric): string {
  return (
    metric.type.text ??
    metric.type.coding?.[0]?.display ??
    `Device Metric ${metric.id}`
  );
}

function buildMetricContent(metric: FhirDeviceMetric): string {
  const parts: string[] = [];

  parts.push(`Metric: ${getMetricName(metric)}`);

  const unit = metric.unit?.text ?? metric.unit?.coding?.[0]?.display;
  if (unit) {
    parts.push(`Unit: ${unit}`);
  }

  if (metric.category) {
    parts.push(`Category: ${metric.category}`);
  }

  if (metric.operationalStatus) {
    parts.push(`Operational Status: ${metric.operationalStatus}`);
  }

  if (metric.source?.display) {
    parts.push(`Source: ${metric.source.display}`);
  }

  if (metric.calibration?.length) {
    for (const cal of metric.calibration) {
      const calParts = [cal.type, cal.state].filter(Boolean).join(" — ");
      if (calParts) {
        parts.push(`Calibration: ${calParts}`);
      }
    }
  }

  return parts.join("\n");
}

function buildMetricMetadata(
  metric: FhirDeviceMetric
): GenericDocument["metadata"] {
  const metricType = metric.type.coding?.[0]?.code;
  const unit = metric.unit?.text ?? metric.unit?.coding?.[0]?.display;

  return {
    resourceType: "DeviceMetric",
    fhirId: metric.id,
    metricTypeDisplay: getMetricName(metric),
    ...(metricType != null && { metricType }),
    ...(unit != null && { unit }),
    ...(metric.category != null && { category: metric.category }),
    ...(metric.operationalStatus != null && {
      operationalStatus: metric.operationalStatus,
    }),
    ...(metric.calibration?.length != null && {
      calibrationCount: metric.calibration.length,
    }),
  };
}

export async function transformDeviceMetric(
  metric: FhirDeviceMetric,
  context: FhirTransformContext
): Promise<GenericDocument> {
  const title = getMetricName(metric);
  const content = buildMetricContent(metric);
  const metadata = buildMetricMetadata(metric);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_device_metric_${metric.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: metric.id,
    document_type: "healthcare_device_metric",
    title,
    content,
    created_at: metric.meta?.lastUpdated
      ? new Date(metric.meta.lastUpdated).getTime()
      : Date.now(),
    updated_at: metric.meta?.lastUpdated
      ? new Date(metric.meta.lastUpdated).getTime()
      : Date.now(),
    source_type: "fhir",
    url: `${context.fhirBaseUrl}/DeviceMetric/${metric.id}`,
    is_public: false,
    access_control: buildAccessControl(context.teamId),
    metadata,
    checksum,
  };
}
