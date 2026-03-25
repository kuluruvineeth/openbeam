import type { JFrogClient } from "../client";

export interface JFrogViolation {
  id: string;
  type: string;
  severity: string;
  description: string;
  created: string;
  watchName?: string;
  issueId?: string;
  summary?: string;
  impactedArtifacts: JFrogImpactedArtifact[];
  cve?: string[];
  cvss_v2?: string;
  cvss_v3?: string;
  fixedVersions?: string[];
  references?: string[];
  provider?: string;
}

export interface JFrogImpactedArtifact {
  name: string;
  displayName: string;
  path: string;
  pkgType: string;
  infectedFiles: { name: string; path: string; sha256: string }[];
}

interface ViolationsResponse {
  violations: ViolationResult[];
  total_violations: number;
  offset?: number;
}

interface ViolationResult {
  violation_details_url: string;
  type: string;
  severity: string;
  description: string;
  created: string;
  watch_name?: string;
  issue_id?: string;
  summary?: string;
  impacted_artifacts: {
    name: string;
    display_name: string;
    path: string;
    pkg_type: string;
    infected_files: { name: string; path: string; sha256: string }[];
  }[];
  cve?: string[];
  cvss_v2?: string;
  cvss_v3?: string;
  properties?: Record<string, string>;
  references?: string[];
  provider?: string;
}

interface ListViolationsOptions {
  pageNum?: number;
  numOfRows?: number;
  orderBy?: string;
  direction?: string;
  createdFrom?: string;
}

function extractViolationId(url: string): string {
  const parts = url.split("/");
  return parts.at(-1) ?? url;
}

function mapViolation(result: ViolationResult): JFrogViolation {
  return {
    id: extractViolationId(result.violation_details_url),
    type: result.type,
    severity: result.severity,
    description: result.description,
    created: result.created,
    watchName: result.watch_name,
    issueId: result.issue_id,
    summary: result.summary,
    impactedArtifacts: (result.impacted_artifacts ?? []).map((a) => ({
      name: a.name,
      displayName: a.display_name,
      path: a.path,
      pkgType: a.pkg_type,
      infectedFiles: a.infected_files ?? [],
    })),
    cve: result.cve,
    cvss_v2: result.cvss_v2,
    cvss_v3: result.cvss_v3,
    references: result.references,
    provider: result.provider,
  };
}

export async function* listViolations(
  client: JFrogClient,
  options: ListViolationsOptions = {}
): AsyncGenerator<JFrogViolation[], void, undefined> {
  const numOfRows = options.numOfRows ?? 100;
  let pageNum = options.pageNum ?? 1;

  while (true) {
    const body: Record<string, unknown> = {
      filters: {
        ...(options.createdFrom && { created_from: options.createdFrom }),
      },
      pagination: {
        order_by: options.orderBy ?? "created",
        direction: options.direction ?? "desc",
        limit: numOfRows,
        offset: (pageNum - 1) * numOfRows,
      },
    };

    const response = await client.post<ViolationsResponse>(
      "/xray/api/v1/violations",
      body
    );

    const violations = (response.violations ?? []).map(mapViolation);
    if (violations.length > 0) {
      yield violations;
    }

    if (violations.length < numOfRows) {
      break;
    }

    pageNum += 1;
  }
}
