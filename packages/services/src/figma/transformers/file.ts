import type {
  FigmaFileDetail,
  FigmaFileMeta,
  FigmaTransformContext,
} from "@openbeam/types/services/connectors/figma";
import type { GenericDocument } from "@openbeam/vespa";

export function transformFigmaFile(
  fileMeta: FigmaFileMeta,
  context: FigmaTransformContext,
  detail?: FigmaFileDetail
): GenericDocument {
  const pages = detail?.document.children.map((c) => c.name).join(", ") ?? "";

  const componentEntries = detail?.components
    ? Object.values(detail.components)
    : [];

  const componentNames = componentEntries.map((c) => c.name).join(", ");

  const contentParts = [fileMeta.name];
  if (pages) {
    contentParts.push(`Pages: ${pages}`);
  }
  if (componentNames) {
    contentParts.push(`Components: ${componentNames}`);
  }

  const createdAt = new Date(fileMeta.last_modified).getTime();

  return {
    id: `${context.connectorId}_file_${fileMeta.key}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: fileMeta.key,
    document_type: "file",
    document_subtype: "design",
    title: fileMeta.name,
    content: contentParts.join("\n"),
    created_at: createdAt,
    updated_at: createdAt,
    url: `https://www.figma.com/design/${fileMeta.key}`,
    is_public: false,
    access_control: [],
    metadata: {
      ...(fileMeta.thumbnail_url && { thumbnailUrl: fileMeta.thumbnail_url }),
      ...(pages && { pages }),
      ...(componentNames && { components: componentNames }),
      componentCount: String(componentEntries.length),
      ...(detail?.version && { version: detail.version }),
    },
  };
}

export function transformFigmaComponent(
  component: FigmaComponent,
  fileKey: string,
  fileName: string,
  context: FigmaTransformContext
): GenericDocument {
  const contentParts = [component.name];
  if (component.description) {
    contentParts.push(component.description);
  }
  if (component.containing_frame?.pageName) {
    contentParts.push(`Page: ${component.containing_frame.pageName}`);
  }
  if (component.containing_frame?.name) {
    contentParts.push(`Frame: ${component.containing_frame.name}`);
  }

  return {
    id: `${context.connectorId}_component_${component.key}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: component.key,
    document_type: "component",
    document_subtype: "design",
    title: component.name,
    content: contentParts.join("\n"),
    created_at: Date.now(),
    updated_at: Date.now(),
    url: `https://www.figma.com/design/${fileKey}`,
    is_public: false,
    access_control: [],
    metadata: {
      fileKey,
      fileName,
      ...(component.description && { description: component.description }),
      ...(component.containing_frame?.pageName && {
        page: component.containing_frame.pageName,
      }),
      ...(component.containing_frame?.name && {
        frame: component.containing_frame.name,
      }),
    },
  };
}
