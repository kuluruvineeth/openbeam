import type { WorkdayTransformContext } from "@openbeam/types/services/connectors/workday";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { WorkdayOrganization } from "../client";

function buildOrgContent(org: WorkdayOrganization): string {
  const parts: string[] = [];

  if (org.descriptor) {
    parts.push(`Organization: ${org.descriptor}`);
  }
  if (org.organizationType) {
    parts.push(`Type: ${org.organizationType}`);
  }
  if (org.parent?.descriptor) {
    parts.push(`Parent: ${org.parent.descriptor}`);
  }
  if (org.manager?.descriptor) {
    parts.push(`Manager: ${org.manager.descriptor}`);
  }
  if (org.memberCount !== undefined) {
    parts.push(`Members: ${org.memberCount}`);
  }
  if (org.isActive !== undefined) {
    parts.push(`Status: ${org.isActive ? "Active" : "Inactive"}`);
  }

  return parts.join("\n");
}

function buildOrgMetadata(
  org: WorkdayOrganization,
  ctx: WorkdayTransformContext
): GenericDocument["metadata"] {
  return {
    organizationId: org.id,
    organizationType: org.organizationType || "",
    parentId: org.parent?.id || "",
    parentName: org.parent?.descriptor || "",
    managerId: org.manager?.id || "",
    managerName: org.manager?.descriptor || "",
    memberCount: String(org.memberCount ?? 0),
    isActive: String(org.isActive ?? true),
    tenant: ctx.tenant,
  };
}

export async function transformOrganization(
  org: WorkdayOrganization,
  ctx: WorkdayTransformContext
): Promise<GenericDocument> {
  const title = org.descriptor || "Unknown Organization";
  const content = buildOrgContent(org);
  const metadata = buildOrgMetadata(org, ctx);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const orgUrl = `https://${encodeURIComponent(ctx.host)}/ccx/api/v1/${encodeURIComponent(ctx.tenant)}/organizations/${encodeURIComponent(org.id)}`;

  return {
    id: `${ctx.connectorId}_org_${org.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: org.id,
    document_type: "organization",
    document_subtype: org.organizationType?.toLowerCase() || "department",
    title,
    content,
    created_at: Date.now(),
    updated_at: Date.now(),
    source_type: "workday",
    url: orgUrl,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    author_id: org.manager?.id || "",
    author_name: org.manager?.descriptor || "",
    metadata,
    checksum,
  };
}

export function transformOrganizations(
  orgs: WorkdayOrganization[],
  ctx: WorkdayTransformContext
): Promise<GenericDocument[]> {
  return Promise.all(orgs.map((o) => transformOrganization(o, ctx)));
}
