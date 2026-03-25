import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { PhabricatorProject } from "../api/projects";
import { buildPhabricatorUrl, remarkupToPlainText } from "./utils";

function buildProjectContent(project: PhabricatorProject): string {
  const parts: string[] = [];

  if (project.fields.description?.raw) {
    parts.push(remarkupToPlainText(project.fields.description.raw));
  }

  parts.push(`Icon: ${project.fields.icon.name}`);
  parts.push(`Color: ${project.fields.color.name}`);

  if (project.fields.parent) {
    parts.push(`Parent: ${project.fields.parent.name}`);
  }

  if (project.fields.milestone !== null) {
    parts.push(`Milestone: #${project.fields.milestone}`);
  }

  const memberCount = project.attachments.members?.members.length ?? 0;
  if (memberCount > 0) {
    parts.push(`Members: ${memberCount}`);
  }

  return parts.join("\n");
}

export async function transformProject(
  project: PhabricatorProject,
  context: PhabricatorTransformContext
): Promise<GenericDocument> {
  const title = project.fields.name;
  const content = buildProjectContent(project);

  const slug = project.fields.slug || String(project.id);
  const url = buildPhabricatorUrl(
    context.instanceUrl,
    `/project/view/${slug}/`
  );

  const metadata: GenericDocument["metadata"] = {
    projectId: String(project.id),
    phid: project.phid,
    icon: project.fields.icon.name,
    color: project.fields.color.name,
    subtype: project.fields.subtype,
    depth: String(project.fields.depth),
    memberCount: String(project.attachments.members?.members.length ?? 0),
    ...(project.fields.slug && { slug: project.fields.slug }),
    ...(project.fields.parent && {
      parentName: project.fields.parent.name,
    }),
    ...(project.fields.milestone !== null && {
      milestone: String(project.fields.milestone),
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_project_${project.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(project.id),
    document_type: "project",
    document_subtype: project.fields.icon.name,
    title,
    content,
    created_at: project.fields.dateCreated * 1000,
    updated_at: project.fields.dateModified * 1000,
    source_type: "phabricator",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
