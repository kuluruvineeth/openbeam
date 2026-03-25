import type { PhabricatorTransformContext } from "@openbeam/types/services/connectors/phabricator";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { PhabricatorRevision } from "../api/revisions";
import { remarkupToPlainText } from "./utils";

function buildRevisionContent(revision: PhabricatorRevision): string {
  const parts: string[] = [];

  if (revision.fields.summary) {
    parts.push(remarkupToPlainText(revision.fields.summary));
  }

  if (revision.fields.testPlan) {
    parts.push(`Test Plan: ${remarkupToPlainText(revision.fields.testPlan)}`);
  }

  parts.push(`Status: ${revision.fields.status.name}`);

  if (revision.fields.isDraft) {
    parts.push("Draft: Yes");
  }

  const reviewers = revision.attachments.reviewers?.reviewers;
  if (reviewers && reviewers.length > 0) {
    parts.push(`Reviewers: ${reviewers.length}`);
  }

  return parts.join("\n");
}

export async function transformRevision(
  revision: PhabricatorRevision,
  context: PhabricatorTransformContext
): Promise<GenericDocument> {
  const title = revision.fields.title;
  const content = buildRevisionContent(revision);
  const url = revision.fields.uri;

  const reviewers = revision.attachments.reviewers?.reviewers ?? [];

  const metadata: GenericDocument["metadata"] = {
    revisionId: String(revision.id),
    phid: revision.phid,
    status: revision.fields.status.name,
    statusValue: revision.fields.status.value,
    isClosed: revision.fields.status.closed,
    isDraft: revision.fields.isDraft,
    reviewerCount: String(reviewers.length),
    ...(revision.fields.repositoryPHID && {
      repositoryPhid: revision.fields.repositoryPHID,
    }),
    ...(reviewers.length > 0 && {
      reviewerPhids: reviewers.map((r) => r.reviewerPHID).join(", "),
    }),
  };

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_revision_${revision.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: String(revision.id),
    document_type: "revision",
    document_subtype: revision.fields.status.name,
    title,
    content,
    created_at: revision.fields.dateCreated * 1000,
    updated_at: revision.fields.dateModified * 1000,
    source_type: "phabricator",
    url,
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
