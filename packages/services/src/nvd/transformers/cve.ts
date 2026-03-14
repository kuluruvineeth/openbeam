import type {
  NvdCve,
  NvdTransformContext,
} from "@openbeam/types/services/connectors/nvd";
import type { GenericDocument } from "@openbeam/vespa";
import { calculateDocumentChecksum } from "../../lib/checksum";

const NVD_DETAIL_BASE = "https://nvd.nist.gov/vuln/detail";

function getEnglishDescription(cve: NvdCve): string {
  const english = cve.descriptions.find((d) => d.lang === "en");
  return english?.value ?? cve.descriptions[0]?.value ?? "";
}

function getPrimaryCvssV31(cve: NvdCve) {
  const metrics = cve.metrics?.cvssMetricV31;
  if (!metrics || metrics.length === 0) {
    return;
  }
  return metrics.find((m) => m.type === "Primary") ?? metrics[0];
}

function extractCweIds(cve: NvdCve): string[] {
  if (!cve.weaknesses) {
    return [];
  }

  const ids: string[] = [];
  for (const weakness of cve.weaknesses) {
    for (const desc of weakness.description) {
      if (
        desc.lang === "en" &&
        desc.value !== "NVD-CWE-Other" &&
        desc.value !== "NVD-CWE-noinfo"
      ) {
        ids.push(desc.value);
      }
    }
  }
  return ids;
}

function buildCveContent(cve: NvdCve): string {
  const parts: string[] = [];
  const description = getEnglishDescription(cve);

  if (description) {
    parts.push(description);
  }

  const cvss = getPrimaryCvssV31(cve);
  if (cvss) {
    parts.push(
      `CVSS v3.1 Score: ${cvss.cvssData.baseScore} (${cvss.cvssData.baseSeverity})`
    );
    parts.push(`Vector: ${cvss.cvssData.vectorString}`);
  }

  const cweIds = extractCweIds(cve);
  if (cweIds.length > 0) {
    parts.push(`CWE: ${cweIds.join(", ")}`);
  }

  if (cve.vulnStatus) {
    parts.push(`Status: ${cve.vulnStatus}`);
  }

  if (cve.cisaVulnerabilityName) {
    parts.push(`CISA: ${cve.cisaVulnerabilityName}`);
  }

  if (cve.cisaRequiredAction) {
    parts.push(`Required Action: ${cve.cisaRequiredAction}`);
  }

  if (cve.references && cve.references.length > 0) {
    const refUrls = cve.references.slice(0, 10).map((r) => r.url);
    parts.push(`References: ${refUrls.join(", ")}`);
  }

  return parts.join("\n");
}

function buildCveTitle(cve: NvdCve): string {
  const description = getEnglishDescription(cve);
  const truncated =
    description.length > 100 ? description.slice(0, 100) : description;
  return `${cve.id}: ${truncated}`;
}

function buildCveMetadata(cve: NvdCve): GenericDocument["metadata"] {
  const cvss = getPrimaryCvssV31(cve);
  const cweIds = extractCweIds(cve);
  const refs = cve.references?.map((r) => r.url) ?? [];

  return {
    cveId: cve.id,
    vulnStatus: cve.vulnStatus ?? "Unknown",
    published: cve.published,
    lastModified: cve.lastModified,
    ...(cvss && {
      cvssScore: cvss.cvssData.baseScore,
      severity: cvss.cvssData.baseSeverity,
      cvssVector: cvss.cvssData.vectorString,
    }),
    ...(cweIds.length > 0 && { cweIds: JSON.stringify(cweIds) }),
    ...(refs.length > 0 && { references: JSON.stringify(refs.slice(0, 10)) }),
    ...(cve.sourceIdentifier && { sourceIdentifier: cve.sourceIdentifier }),
    ...(cve.cisaExploitAdd && { cisaExploitAdd: cve.cisaExploitAdd }),
    ...(cve.cisaActionDue && { cisaActionDue: cve.cisaActionDue }),
  };
}

export async function transformCve(
  cve: NvdCve,
  context: NvdTransformContext
): Promise<GenericDocument> {
  const title = buildCveTitle(cve);
  const content = buildCveContent(cve);
  const metadata = buildCveMetadata(cve);

  const checksum = await calculateDocumentChecksum({
    title,
    content,
    metadata,
  });

  return {
    id: `${context.connectorId}_vulnerability_${cve.id}`,
    connector_id: context.connectorId,
    connector_type: context.connectorType,
    team_id: context.teamId,
    workspace_id: context.workspaceId,
    external_id: cve.id,
    document_type: "vulnerability",
    title,
    content,
    created_at: new Date(cve.published).getTime(),
    updated_at: new Date(cve.lastModified).getTime(),
    source_type: "nvd",
    source_name: "National Vulnerability Database",
    url: `${NVD_DETAIL_BASE}/${cve.id}`,
    is_public: true,
    access_control: [],
    metadata,
    checksum,
  };
}
