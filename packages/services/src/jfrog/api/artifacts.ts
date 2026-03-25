import type { JFrogClient } from "../client";

export interface JFrogArtifact {
  repo: string;
  path: string;
  name: string;
  type: string;
  size: number;
  created: string;
  createdBy: string;
  modified: string;
  modifiedBy: string;
  updated: string;
  actualMd5?: string;
  actualSha1?: string;
  sha256?: string;
  mimeType?: string;
  properties?: Record<string, string[]>;
  downloadUri?: string;
}

interface AqlSearchResponse {
  results: AqlResult[];
  range: {
    start_pos: number;
    end_pos: number;
    total: number;
    limit?: number;
  };
}

interface AqlResult {
  repo: string;
  path: string;
  name: string;
  type: string;
  size: number;
  created: string;
  created_by: string;
  modified: string;
  modified_by: string;
  updated: string;
  actual_md5?: string;
  actual_sha1?: string;
  sha256?: string;
  mime_type?: string;
  properties?: { key: string; value: string }[];
}

interface ListArtifactsOptions {
  repos?: string[];
  modifiedSince?: string;
  offset?: number;
  limit?: number;
}

function buildAqlQuery(options: ListArtifactsOptions): string {
  const clauses: string[] = ['{"type":{"$ne":"folder"}}'];

  if (options.repos?.length) {
    const repoList = options.repos.map((r) => `"${r}"`).join(",");
    clauses.push(`{"repo":{"$match":${repoList}}}`);
  }

  if (options.modifiedSince) {
    clauses.push(`{"modified":{"$gt":"${options.modifiedSince}"}}`);
  }

  const filter =
    clauses.length > 1 ? `"$and":[${clauses.join(",")}]` : (clauses[0] ?? "");

  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  return `items.find({${filter}}).include("repo","path","name","type","size","created","created_by","modified","modified_by","updated","actual_md5","actual_sha1","sha256","mime_type","property").sort({"$asc":["modified"]}).offset(${offset}).limit(${limit})`;
}

function mapAqlResult(result: AqlResult): JFrogArtifact {
  const properties: Record<string, string[]> = {};
  if (result.properties) {
    for (const prop of result.properties) {
      const existing = properties[prop.key];
      if (existing) {
        existing.push(prop.value);
      } else {
        properties[prop.key] = [prop.value];
      }
    }
  }

  return {
    repo: result.repo,
    path: result.path,
    name: result.name,
    type: result.type,
    size: result.size,
    created: result.created,
    createdBy: result.created_by,
    modified: result.modified,
    modifiedBy: result.modified_by,
    updated: result.updated,
    actualMd5: result.actual_md5,
    actualSha1: result.actual_sha1,
    sha256: result.sha256,
    mimeType: result.mime_type,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };
}

export async function* listArtifacts(
  client: JFrogClient,
  options: ListArtifactsOptions = {}
): AsyncGenerator<JFrogArtifact[], void, undefined> {
  const limit = options.limit ?? 100;
  let offset = options.offset ?? 0;

  while (true) {
    const query = buildAqlQuery({ ...options, offset, limit });
    const response = await client.post<AqlSearchResponse>(
      "/artifactory/api/search/aql",
      query
    );

    const artifacts = response.results.map(mapAqlResult);
    if (artifacts.length > 0) {
      yield artifacts;
    }

    if (artifacts.length < limit) {
      break;
    }

    offset += limit;
  }
}
