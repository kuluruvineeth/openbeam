import type { HaystackTransformContext } from "@openbeam/types/services/connectors/haystack";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { HaystackDepartment } from "../api/departments";

function buildDepartmentContent(dept: HaystackDepartment): string {
  const parts: string[] = [];

  parts.push(dept.name);

  if (dept.description) {
    parts.push(dept.description);
  }

  if (dept.head) {
    parts.push(`Head: ${dept.head.first_name} ${dept.head.last_name}`);
  }

  parts.push(`Headcount: ${dept.headcount}`);

  if (dept.parent) {
    parts.push(`Parent Department: ${dept.parent.name}`);
  }

  return parts.join("\n");
}

export async function transformDepartment(
  dept: HaystackDepartment,
  context: HaystackTransformContext
): Promise<GenericDocument> {
  const title = dept.name;
  const content = buildDepartmentContent(dept);
  const metadata: GenericDocument["metadata"] = {
    headcount: String(dept.headcount),
    ...(dept.head && {
      head: `${dept.head.first_name} ${dept.head.last_name}`,
    }),
    ...(dept.parent && { parentDepartment: dept.parent.name }),
    ...(dept.description && { description: dept.description }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_department_${dept.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: dept.id,
    document_type: "department",
    title,
    content,
    created_at: new Date(dept.created_at).getTime(),
    updated_at: new Date(dept.updated_at).getTime(),
    source_type: "haystack",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: dept.head
      ? `${dept.head.first_name} ${dept.head.last_name}`
      : undefined,
    author_email: dept.head?.email,
  };
}
