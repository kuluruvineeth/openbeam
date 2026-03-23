import type { AzureDevOpsClient } from "../client";

export type AzureDevOpsIdentityRef = {
  id?: string;
  displayName: string;
  uniqueName?: string;
};

export type AzureDevOpsWorkItem = {
  id: number;
  rev: number;
  url: string;
  fields: Record<
    string,
    string | number | AzureDevOpsIdentityRef | undefined
  > & {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.CreatedDate": string;
    "System.ChangedDate": string;
    "System.TeamProject": string;
    "System.CreatedBy": AzureDevOpsIdentityRef;
    "System.Description"?: string;
    "System.AssignedTo"?: AzureDevOpsIdentityRef;
    "System.Tags"?: string;
    "System.AreaPath"?: string;
    "System.IterationPath"?: string;
    "System.Reason"?: string;
    "Microsoft.VSTS.Common.Priority"?: number;
  };
};

type WiqlResponse = {
  queryType: string;
  workItems: Array<{ id: number; url: string }>;
};

const WORK_ITEM_FIELDS = [
  "System.Id",
  "System.Title",
  "System.State",
  "System.WorkItemType",
  "System.CreatedDate",
  "System.ChangedDate",
  "System.CreatedBy",
  "System.AssignedTo",
  "System.Description",
  "System.Tags",
  "System.TeamProject",
  "System.AreaPath",
  "System.IterationPath",
  "System.Reason",
  "Microsoft.VSTS.Common.Priority",
];

type WorkItemsBatchResponse = {
  count: number;
  value: AzureDevOpsWorkItem[];
};

const BATCH_SIZE = 200;

export async function* queryWorkItems(
  client: AzureDevOpsClient,
  project: string,
  options: {
    changedSince?: string;
    workItemTypes?: string[];
    lookbackDays?: number;
  } = {}
): AsyncGenerator<AzureDevOpsWorkItem[]> {
  let wiqlWhere = "1=1";

  if (options.changedSince) {
    wiqlWhere += ` AND [System.ChangedDate] > '${options.changedSince}'`;
  } else if (options.lookbackDays) {
    wiqlWhere += ` AND [System.ChangedDate] >= @today - ${options.lookbackDays}`;
  }

  if (options.workItemTypes?.length) {
    const types = options.workItemTypes.map((t) => `'${t}'`).join(", ");
    wiqlWhere += ` AND [System.WorkItemType] IN (${types})`;
  }

  const wiql = `SELECT [System.Id] FROM WorkItems WHERE ${wiqlWhere} ORDER BY [System.ChangedDate] DESC`;

  const wiqlRes = await client.post<WiqlResponse>(
    `/${encodeURIComponent(project)}/_apis/wit/wiql`,
    { query: wiql }
  );

  const ids = wiqlRes.workItems.map((w) => w.id);
  if (ids.length === 0) {
    return;
  }

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const res = await client.post<WorkItemsBatchResponse>(
      "/_apis/wit/workitemsbatch",
      { ids: chunk, fields: WORK_ITEM_FIELDS }
    );
    yield res.value;
  }
}
