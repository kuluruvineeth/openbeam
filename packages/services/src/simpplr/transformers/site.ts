import type { SimpplrTransformContext } from "@openbeam/types/services/connectors/simpplr";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { SimpplrSite } from "../api/sites";

function buildSiteContent(site: SimpplrSite): string {
  const parts: string[] = [site.name];

  if (site.description) {
    parts.push(site.description);
  }

  if (site.siteType) {
    parts.push(`Type: ${site.siteType}`);
  }

  if (site.status) {
    parts.push(`Status: ${site.status}`);
  }

  if (site.memberCount !== undefined) {
    parts.push(`Members: ${site.memberCount}`);
  }

  if (site.owner) {
    parts.push(`Owner: ${site.owner.displayName}`);
  }

  return parts.join("\n");
}

export async function transformSite(
  site: SimpplrSite,
  context: SimpplrTransformContext
): Promise<GenericDocument> {
  const title = site.name;
  const content = buildSiteContent(site);
  const metadata: GenericDocument["metadata"] = {
    ...(site.siteType && { siteType: site.siteType }),
    ...(site.status && { status: site.status }),
    ...(site.memberCount !== undefined && {
      memberCount: String(site.memberCount),
    }),
    ...(site.owner && { owner: site.owner.displayName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_site_${site.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: site.id,
    document_type: "site",
    document_subtype: site.siteType,
    title,
    content,
    url: site.url ?? `${context.instanceUrl}/site/${site.id}`,
    created_at: new Date(site.createdAt).getTime(),
    updated_at: new Date(site.updatedAt).getTime(),
    source_type: "simpplr",
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: site.owner?.displayName,
    author_email: site.owner?.email,
  };
}
