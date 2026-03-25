import type { MindtickleTransformContext } from "@openbeam/types/services/connectors/mindtickle";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { MindtickleModule } from "../api/modules";
import { stripHtml } from "./utils";

function buildModuleContent(mod: MindtickleModule): string {
  const parts: string[] = [];

  if (mod.description) {
    parts.push(stripHtml(mod.description));
  }

  if (mod.content) {
    parts.push(stripHtml(mod.content));
  }

  parts.push(`Type: ${mod.module_type}`);
  parts.push(`Course: ${mod.course_name}`);

  if (mod.duration_minutes > 0) {
    parts.push(`Duration: ${mod.duration_minutes} minutes`);
  }

  return parts.join("\n");
}

export async function transformModule(
  mod: MindtickleModule,
  context: MindtickleTransformContext
): Promise<GenericDocument> {
  const title = mod.title;
  const content = buildModuleContent(mod);
  const metadata: GenericDocument["metadata"] = {
    moduleType: mod.module_type,
    courseId: mod.course_id,
    courseName: mod.course_name,
    durationMinutes: String(mod.duration_minutes),
    order: String(mod.order),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_module_${mod.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: mod.id,
    document_type: "module",
    document_subtype: mod.module_type,
    title,
    content,
    created_at: new Date(mod.created_at).getTime(),
    updated_at: new Date(mod.updated_at).getTime(),
    source_type: "mindtickle",
    url: `https://app.mindtickle.com/courses/${mod.course_id}/modules/${mod.id}`,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
