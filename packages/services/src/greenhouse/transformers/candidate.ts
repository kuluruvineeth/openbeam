import type { GreenhouseTransformContext } from "@openbeam/types/services/connectors/greenhouse";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { GreenhouseCandidate } from "../client";

function buildCandidateContent(candidate: GreenhouseCandidate): string {
  const parts: string[] = [];
  parts.push(`Candidate: ${candidate.first_name} ${candidate.last_name}`);

  if (candidate.title) {
    parts.push(`Title: ${candidate.title}`);
  }

  if (candidate.company) {
    parts.push(`Company: ${candidate.company}`);
  }

  if (candidate.emails.length > 0) {
    parts.push(`Emails: ${candidate.emails.map((e) => e.value).join(", ")}`);
  }

  if (candidate.phone_numbers.length > 0) {
    parts.push(
      `Phone: ${candidate.phone_numbers.map((p) => p.value).join(", ")}`
    );
  }

  if (candidate.tags.length > 0) {
    parts.push(`Tags: ${candidate.tags.join(", ")}`);
  }

  const activeApps = candidate.applications.filter(
    (a) => a.status === "active"
  ).length;
  if (activeApps > 0) {
    parts.push(`Active Applications: ${activeApps}`);
  }

  return parts.join("\n");
}

export async function transformCandidate(
  candidate: GreenhouseCandidate,
  ctx: GreenhouseTransformContext
): Promise<GenericDocument> {
  const fullName = `${candidate.first_name} ${candidate.last_name}`;
  const content = buildCandidateContent(candidate);
  const primaryEmail = candidate.emails[0]?.value;

  const metadata: GenericDocument["metadata"] = {
    isPrivate: candidate.is_private,
    applicationCount: candidate.applications.length,
    activeApplications: candidate.applications.filter(
      (a) => a.status === "active"
    ).length,
  };

  if (candidate.title) {
    metadata.title = candidate.title;
  }

  if (candidate.company) {
    metadata.company = candidate.company;
  }

  if (candidate.tags.length > 0) {
    metadata.tags = candidate.tags.join(", ");
  }

  if (primaryEmail) {
    metadata.email = primaryEmail;
  }

  const checksum = await calculateDocumentChecksum({
    title: fullName,
    content,
    metadata,
  });

  return {
    id: `${ctx.connectorId}_candidate_${candidate.id}`,
    connector_id: ctx.connectorId,
    connector_type: ctx.connectorType,
    team_id: ctx.teamId,
    workspace_id: ctx.workspaceId,
    external_id: String(candidate.id),
    document_type: "candidate",
    document_subtype: "profile",
    title: fullName,
    content,
    created_at: new Date(candidate.created_at).getTime(),
    updated_at: new Date(candidate.updated_at).getTime(),
    source_type: "greenhouse",
    url: `https://app.greenhouse.io/people/${candidate.id}`,
    is_public: false,
    access_control: [`team:${ctx.teamId}`],
    author_name: fullName,
    ...(primaryEmail && { author_email: primaryEmail }),
    author_id: String(candidate.id),
    metadata,
    checksum,
  };
}
