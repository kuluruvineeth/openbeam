import type { AhaTransformContext } from "@openbeam/types/services/connectors/aha";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { AhaRelease } from "../api/releases";
import { stripHtml } from "./utils";

function buildReleaseContent(release: AhaRelease): string {
  const parts: string[] = [];

  if (release.theme?.body) {
    parts.push(stripHtml(release.theme.body));
  }

  parts.push(`Status: ${release.workflow_status.name}`);
  parts.push(`Progress: ${Math.round(release.progress)}%`);

  if (release.release_date) {
    parts.push(`Release date: ${release.release_date}`);
  }

  if (release.released) {
    parts.push("Released: Yes");
  }

  if (release.owner) {
    parts.push(`Owner: ${release.owner.name}`);
  }

  return parts.join("\n");
}

export async function transformRelease(
  release: AhaRelease,
  context: AhaTransformContext
): Promise<GenericDocument> {
  const title = release.name;
  const content = buildReleaseContent(release);
  const metadata: GenericDocument["metadata"] = {
    referenceNum: release.reference_num,
    status: release.workflow_status.name,
    statusColor: release.workflow_status.color,
    progress: String(Math.round(release.progress)),
    released: release.released,
    parkingLot: release.parking_lot,
    ...(release.release_date && { releaseDate: release.release_date }),
    ...(release.owner && { owner: release.owner.name }),
    productId: release.product_id,
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_release_${release.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: release.id,
    document_type: "release",
    document_subtype: release.workflow_status.name,
    title,
    content,
    created_at: new Date(release.created_at).getTime(),
    updated_at: new Date(release.updated_at).getTime(),
    source_type: "aha",
    url: release.url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
    author_name: release.owner?.name,
    author_email: release.owner?.email,
  };
}
