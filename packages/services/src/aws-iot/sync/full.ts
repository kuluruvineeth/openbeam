import type {
  AwsIotSyncBatch,
  AwsIotTransformContext,
} from "@openbeam/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openbeam/vespa";
import type { AwsIotClient } from "../client";
import { type ThingWithShadow, transformThings } from "../transformers/thing";
import { transformThingGroups } from "../transformers/thing-group";
import { createSyncBatch } from "./utils";

interface FullSyncOptions {
  pageSize?: number;
  syncThingGroups?: boolean;
  syncShadows?: boolean;
}

async function* paginateThings(
  client: AwsIotClient,
  context: AwsIotTransformContext,
  pageSize: number,
  syncShadows: boolean
): AsyncGenerator<AwsIotSyncBatch<GenericDocument>, void, undefined> {
  let nextToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listThings({
      maxResults: pageSize,
      nextToken,
    });

    const thingsWithShadows: ThingWithShadow[] = [];
    for (const thing of response.things) {
      const detail = await client.describeThing(thing.thingName);
      let shadow: ThingWithShadow["shadow"] = null;
      if (syncShadows) {
        shadow = await client.getThingShadow(thing.thingName);
      }
      thingsWithShadows.push({ thing: detail, shadow });
    }

    const documents = await transformThings(thingsWithShadows, context);
    hasMore = response.nextToken != null;
    nextToken = response.nextToken;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now(), thingsToken: nextToken },
      "things",
      hasMore
    );
  }
}

async function* paginateThingGroups(
  client: AwsIotClient,
  context: AwsIotTransformContext,
  pageSize: number
): AsyncGenerator<AwsIotSyncBatch<GenericDocument>, void, undefined> {
  let nextToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listThingGroups({
      maxResults: pageSize,
      nextToken,
    });

    const details = await Promise.all(
      response.thingGroups.map((g) => client.describeThingGroup(g.groupName))
    );

    const documents = await transformThingGroups(details, context);
    hasMore = response.nextToken != null;
    nextToken = response.nextToken;

    yield createSyncBatch(
      documents,
      { lastSyncTime: Date.now(), thingGroupsToken: nextToken },
      "thing_groups",
      hasMore
    );
  }
}

export async function* fullSync(
  client: AwsIotClient,
  context: AwsIotTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<AwsIotSyncBatch<GenericDocument>, void, undefined> {
  const {
    pageSize = 250,
    syncThingGroups = true,
    syncShadows = true,
  } = options;

  const clampedPageSize = Math.min(pageSize, 250);

  for await (const batch of paginateThings(
    client,
    context,
    clampedPageSize,
    syncShadows
  )) {
    yield batch;
  }

  if (syncThingGroups) {
    for await (const batch of paginateThingGroups(
      client,
      context,
      clampedPageSize
    )) {
      yield batch;
    }
  }
}
