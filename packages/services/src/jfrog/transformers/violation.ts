import type { JFrogTransformContext } from "@openbeam/types/services/connectors/jfrog";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";
import type { JFrogViolation } from "../api/violations";
import { buildJFrogViolationUrl, formatSeverity } from "./utils";

function buildViolationContent(violation: JFrogViolation): string {
  const parts: string[] = [];

  if (violation.summary) {
    parts.push(violation.summary);
  }

  parts.push(violation.description);
  parts.push(`Severity: ${formatSeverity(violation.severity)}`);
  parts.push(`Type: ${violation.type}`);

  if (violation.cve?.length) {
    parts.push(`CVEs: ${violation.cve.join(", ")}`);
  }

  if (violation.cvss_v3) {
    parts.push(`CVSS v3: ${violation.cvss_v3}`);
  } else if (violation.cvss_v2) {
    parts.push(`CVSS v2: ${violation.cvss_v2}`);
  }

  if (violation.watchName) {
    parts.push(`Watch: ${violation.watchName}`);
  }

  if (violation.provider) {
    parts.push(`Provider: ${violation.provider}`);
  }

  if (violation.fixedVersions?.length) {
    parts.push(`Fixed in: ${violation.fixedVersions.join(", ")}`);
  }

  if (violation.impactedArtifacts.length > 0) {
    const artifactNames = violation.impactedArtifacts
      .map((a) => a.displayName || a.name)
      .join(", ");
    parts.push(`Impacted: ${artifactNames}`);
  }

  if (violation.references?.length) {
    parts.push(`References: ${violation.references.join(", ")}`);
  }

  return parts.join("\n");
}

function buildViolationMetadata(
  violation: JFrogViolation
): GenericDocument["metadata"] {
  return {
    violationId: violation.id,
    violationType: violation.type,
    severity: violation.severity,
    severityLabel: formatSeverity(violation.severity),
    ...(violation.issueId && { issueId: violation.issueId }),
    ...(violation.watchName && { watchName: violation.watchName }),
    ...(violation.provider && { provider: violation.provider }),
    ...(violation.cve?.length && { cves: violation.cve.join(", ") }),
    ...(violation.cvss_v3 && { cvssV3: violation.cvss_v3 }),
    ...(violation.cvss_v2 && { cvssV2: violation.cvss_v2 }),
    ...(violation.fixedVersions?.length && {
      fixedVersions: violation.fixedVersions.join(", "),
    }),
    impactedArtifactCount: violation.impactedArtifacts.length,
    ...(violation.impactedArtifacts.length > 0 && {
      impactedArtifacts: violation.impactedArtifacts
        .map((a) => a.displayName || a.name)
        .join(", "),
    }),
  };
}

export async function transformViolation(
  violation: JFrogViolation,
  context: JFrogTransformContext
): Promise<GenericDocument> {
  const title = violation.summary ?? violation.description.slice(0, 120);
  const content = buildViolationContent(violation);
  const metadata = buildViolationMetadata(violation);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  const createdAt = new Date(violation.created).getTime();

  return {
    id: `${context.connectorId}_violation_${violation.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: violation.id,
    document_type: "violation",
    document_subtype: violation.severity,
    title,
    content,
    created_at: createdAt,
    updated_at: createdAt,
    source_type: "jfrog",
    url: buildJFrogViolationUrl(context.instanceUrl, violation.id),
    is_public: false,
    access_control: [`team:${context.teamId}`],
    metadata,
    checksum,
  };
}
