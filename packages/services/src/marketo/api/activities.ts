import type { MarketoClient } from "../client";

export type MarketoActivity = {
  id: number;
  leadId: number;
  activityDate: string;
  activityTypeId: number;
  primaryAttributeValue: string | null;
  primaryAttributeValueId: number | null;
  attributes?: Array<{ name: string; value: string }>;
};

export type MarketoActivityType = {
  id: number;
  name: string;
  description: string | null;
  primaryAttribute?: { name: string; dataType: string };
  attributes?: Array<{ name: string; dataType: string }>;
};

export async function listActivityTypes(
  client: MarketoClient
): Promise<Map<number, MarketoActivityType>> {
  const response = await client.getApi<MarketoActivityType>(
    "/v1/activities/types.json"
  );
  const types = new Map<number, MarketoActivityType>();
  for (const t of response.result ?? []) {
    types.set(t.id, t);
  }
  return types;
}

export async function getPagingToken(
  client: MarketoClient,
  sinceDatetime: string
): Promise<string> {
  const response = await client.getApi<{ nextPageToken: string }>(
    "/v1/activities/pagingtoken.json",
    { sinceDatetime }
  );
  const token = response.result?.[0]?.nextPageToken;
  if (!token) {
    throw new Error("Failed to obtain Marketo paging token");
  }
  return token;
}

export async function* listActivities(
  client: MarketoClient,
  sinceDatetime: string,
  activityTypeIds?: number[]
): AsyncGenerator<MarketoActivity[], void, undefined> {
  let nextPageToken = await getPagingToken(client, sinceDatetime);
  let hasMore = true;

  while (hasMore) {
    const params: Record<string, string> = {
      nextPageToken,
      batchSize: "300",
    };
    if (activityTypeIds?.length) {
      params.activityTypeIds = activityTypeIds.join(",");
    }

    const response = await client.getApi<MarketoActivity>(
      "/v1/activities.json",
      params
    );

    const result = response.result ?? [];
    if (result.length > 0) {
      yield result;
    }

    hasMore = response.moreResult === true;
    if (response.nextPageToken) {
      nextPageToken = response.nextPageToken;
    } else {
      hasMore = false;
    }
  }
}
