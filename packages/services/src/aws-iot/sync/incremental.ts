import type {
  AwsIotSyncBatch,
  AwsIotTransformContext,
} from "@openplane/types/services/connectors/aws-iot";
import type { GenericDocument } from "@openplane/vespa";
import type { AwsIotClient } from "../client";
import { type ThingWithShadow, transformThings } from "../transformers/thing";
import { createSyncBatch } from "./utils";

interface IncrementalSyncOptions {
  pageSize?: number;
  syncShadows?: boolean;
}

export async function* incrementalSync(
  client: AwsIotClient,
  context: AwsIotTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<AwsIotSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 250, syncShadows = true } = options;
  const clampedPageSize = Math.min(pageSize, 250);

  let nextToken: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const response = await client.listThings({
      maxResults: clampedPageSize,
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
