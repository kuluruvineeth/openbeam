import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { PhabricatorRepository } from "../api/repositories";
import { buildPhabricatorUrl } from "./utils";

function buildRepositoryContent(repo: PhabricatorRepository): string {
  const parts: string[] = [];

  parts.push(`VCS: ${repo.fields.vcs}`);
  parts.push(`Status: ${repo.fields.status}`);

  if (repo.fields.callsign) {
    parts.push(`Callsign: ${repo.fields.callsign}`);
  }

  if (repo.fields.shortName) {
    parts.push(`Short name: ${repo.fields.shortName}`);
  }

  if (repo.fields.isImporting) {
    parts.push("Currently importing");
  }

  const uris = repo.attachments.uris?.uris;
  if (uris && uris.length > 0) {
    const cloneUri = uris.find(
      (u) =>
        u.fields.io.effective === "readwrite" ||
        u.fields.io.effective === "read"
    );
    if (cloneUri) {
      parts.push(`Clone URI: ${cloneUri.fields.uri.display}`);
    }
  }

  return parts.join("\n");
}

export async function transformRepository(
  repo: PhabricatorRepository,
  context: PhabricatorTransformContext
): Promise<GenericDocument> {
  const title = repo.fields.name;
  const content = buildRepositoryContent(repo);

  let pathSegment = `/diffusion/${repo.id}/`;
  if (repo.fields.callsign) {
    pathSegment = `/diffusion/${repo.fields.callsign}/`;
  } else if (repo.fields.shortName) {
    pathSegment = `/source/${repo.fields.shortName}/`;
  }
  const url = buildPhabricatorUrl(context.instanceUrl, pathSegment);

  const metadata: GenericDocument["metadata"] = {
    repositoryId: String(repo.id),
    phid: repo.phid,
    vcs: repo.fields.vcs,
    status: repo.fields.status,
    isImporting: repo.fields.isImporting,
    ...(repo.fields.callsign && { callsign: repo.fields.callsign }),
    ...(repo.fields.shortName && { shortName: repo.fields.shortName }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_repo_${repo.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(repo.id),
    document_type: "repository",
    document_subtype: repo.fields.vcs,
    title,
    content,
    created_at: repo.fields.dateCreated * 1000,
    updated_at: repo.fields.dateModified * 1000,
    source_type: "phabricator",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
