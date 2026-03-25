import type { JenkinsClient } from "../client";

export interface JenkinsMonitorData {
  [key: string]: unknown;
}

export interface JenkinsNode {
  displayName: string;
  description?: string;
  idle: boolean;
  jnlpAgent: boolean;
  numExecutors: number;
  offline: boolean;
  offlineCauseReason?: string;
  temporarilyOffline: boolean;
  monitorData?: JenkinsMonitorData;
}

interface NodeListResponse {
  computer?: JenkinsNode[];
}

const NODE_TREE =
  "computer[displayName,description,idle,jnlpAgent,numExecutors,offline,offlineCauseReason,temporarilyOffline,monitorData[*]]";

export async function listNodes(client: JenkinsClient): Promise<JenkinsNode[]> {
  const response = await client.get<NodeListResponse>("/computer/api/json", {
    tree: NODE_TREE,
  });
  return response.computer ?? [];
}
