import type { JFrogClient } from "../client";

const LEADING_SLASH = /^\//;

export interface JFrogBuild {
  buildName: string;
  buildNumber: string;
  buildStarted: string;
  buildUri: string;
  status?: string;
  durationMillis?: number;
  principal?: string;
  buildAgent?: { name: string; version: string };
  agent?: { name: string; version: string };
  modules?: JFrogBuildModule[];
  properties?: Record<string, string>;
  vcs?: { revision: string; url: string; branch?: string }[];
}

export interface JFrogBuildModule {
  id: string;
  type?: string;
  artifacts?: { name: string; type: string; sha1: string; md5: string }[];
  dependencies?: { id: string; type: string; sha1: string; md5: string }[];
}

interface BuildListResponse {
  builds: { uri: string; lastStarted: string }[];
}

interface BuildRunsResponse {
  buildsNumbers: { uri: string; started: string }[];
}

interface BuildInfoResponse {
  buildInfo: {
    name: string;
    number: string;
    started: string;
    durationMillis?: number;
    principal?: string;
    buildAgent?: { name: string; version: string };
    agent?: { name: string; version: string };
    modules?: JFrogBuildModule[];
    properties?: Record<string, string>;
    vcs?: { revision: string; url: string; branch?: string }[];
    statuses?: { status: string; timestamp: string; user: string }[];
  };
  uri: string;
}

export async function listBuildNames(
  client: JFrogClient
): Promise<{ name: string; lastStarted: string }[]> {
  const response = await client.get<BuildListResponse>(
    "/artifactory/api/build"
  );

  return (response.builds ?? []).map((b) => ({
    name: b.uri.replace(LEADING_SLASH, ""),
    lastStarted: b.lastStarted,
  }));
}

export async function listBuildRuns(
  client: JFrogClient,
  buildName: string
): Promise<{ number: string; started: string }[]> {
  const response = await client.get<BuildRunsResponse>(
    `/artifactory/api/build/${encodeURIComponent(buildName)}`
  );

  return (response.buildsNumbers ?? []).map((b) => ({
    number: b.uri.replace(LEADING_SLASH, ""),
    started: b.started,
  }));
}

export async function getBuildInfo(
  client: JFrogClient,
  buildName: string,
  buildNumber: string
): Promise<JFrogBuild> {
  const response = await client.get<BuildInfoResponse>(
    `/artifactory/api/build/${encodeURIComponent(buildName)}/${encodeURIComponent(buildNumber)}`
  );

  const info = response.buildInfo;
  const latestStatus = info.statuses?.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  return {
    buildName: info.name,
    buildNumber: info.number,
    buildStarted: info.started,
    buildUri: `${client.instanceUrl}/ui/builds/${encodeURIComponent(info.name)}/${encodeURIComponent(info.number)}`,
    status: latestStatus?.status,
    durationMillis: info.durationMillis,
    principal: info.principal,
    buildAgent: info.buildAgent,
    agent: info.agent,
    modules: info.modules,
    properties: info.properties,
    vcs: info.vcs,
  };
}

export async function* listRecentBuilds(
  client: JFrogClient,
  sinceTimestamp?: number
): AsyncGenerator<JFrogBuild[], void, undefined> {
  const buildNames = await listBuildNames(client);

  for (const buildRef of buildNames) {
    if (sinceTimestamp) {
      const buildTime = new Date(buildRef.lastStarted).getTime();
      if (buildTime < sinceTimestamp) {
        continue;
      }
    }

    const runs = await listBuildRuns(client, buildRef.name);
    const batch: JFrogBuild[] = [];

    for (const run of runs) {
      if (sinceTimestamp) {
        const runTime = new Date(run.started).getTime();
        if (runTime < sinceTimestamp) {
          continue;
        }
      }

      const info = await getBuildInfo(client, buildRef.name, run.number);
      batch.push(info);
    }

    if (batch.length > 0) {
      yield batch;
    }
  }
}
