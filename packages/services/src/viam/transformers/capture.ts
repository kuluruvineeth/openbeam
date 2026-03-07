import type {
  ViamCapture,
  ViamTransformContext,
} from "@openbeam/types/services/connectors/viam";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

function buildCaptureContent(capture: ViamCapture): string {
  const parts: string[] = [];

  parts.push(`Component: ${capture.componentName}`);
  parts.push(`Type: ${capture.mimeType}`);
  parts.push(`Captured: ${capture.timestamp}`);

  if (capture.tags.length > 0) {
    parts.push(`Tags: ${capture.tags.join(", ")}`);
  }

  return parts.join("\n");
}

function buildCaptureMetadata(
  capture: ViamCapture
): GenericDocument["metadata"] {
  return {
    captureId: capture.id,
    componentName: capture.componentName,
    machineId: capture.machineId,
    mimeType: capture.mimeType,
    ...(capture.tags.length > 0 && { tags: capture.tags }),
    ...(capture.annotations && { hasAnnotations: true }),
  };
}

export async function transformCapture(
  capture: ViamCapture,
  context: ViamTransformContext
): Promise<GenericDocument> {
  const title = `Capture: ${capture.componentName}`;
  const content = buildCaptureContent(capture);
  const metadata = buildCaptureMetadata(capture);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_capture_${capture.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: capture.id,
    document_type: "robot_capture",
    title,
    content,
    created_at: new Date(capture.timestamp).getTime(),
    updated_at: new Date(capture.timestamp).getTime(),
    source_type: "viam",
    labels: capture.tags.length > 0 ? capture.tags : undefined,
    mime_type: capture.mimeType,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}

export function transformCaptures(
  captures: ViamCapture[],
  context: ViamTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(captures.map((c) => transformCapture(c, context)));
}
