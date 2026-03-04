import type {
  SmartThingsSyncBatch,
  SmartThingsTransformContext,
} from "@openplane/types/services/connectors/smartthings";
import type { GenericDocument } from "@openplane/vespa";
import type { SmartThingsClient, SmartThingsRoom } from "../client";
import { transformDevices } from "../transformers/device";
import { transformLocations } from "../transformers/location";
import { transformScenes } from "../transformers/scene";
import { createSyncBatch } from "./utils";

interface FullSyncOptions {
  pageSize?: number;
  syncScenes?: boolean;
}

export async function* fullSync(
  client: SmartThingsClient,
  context: SmartThingsTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<SmartThingsSyncBatch<GenericDocument>, void, undefined> {
  const { pageSize = 200, syncScenes = true } = options;

  const locations = await client.listLocations();

  const roomsByLocation = new Map<string, SmartThingsRoom[]>();
  const roomLookup = new Map<string, SmartThingsRoom>();
  for (const location of locations) {
    const rooms = await client.listRooms(location.locationId);
    roomsByLocation.set(location.locationId, rooms);
    for (const room of rooms) {
      roomLookup.set(`${location.locationId}:${room.roomId}`, room);
    }
  }

  if (locations.length > 0) {
    const locationDocs = await transformLocations(
      locations,
      context,
      roomsByLocation
    );
    yield createSyncBatch(
      locationDocs,
      { lastSyncTime: Date.now() },
      "locations",
      true
    );
  }

  let page = 0;
  let hasMoreDevices = true;

  while (hasMoreDevices) {
    const response = await client.listDevices({
      page: page + 1,
      max: pageSize,
    });

    if (response.devices.length > 0) {
      const deviceDocs = await transformDevices(
        response.devices,
        context,
        roomLookup
      );

      hasMoreDevices = response.hasMore;
      page += 1;

      yield createSyncBatch(
        deviceDocs,
        { lastSyncTime: Date.now(), page },
        "devices",
        hasMoreDevices || syncScenes
      );
    } else {
      hasMoreDevices = false;
    }
  }

  if (syncScenes) {
    let scenePage = 0;
    let hasMoreScenes = true;

    while (hasMoreScenes) {
      const response = await client.listScenes({
        page: scenePage + 1,
        max: pageSize,
      });

      if (response.scenes.length > 0) {
        const sceneDocs = await transformScenes(response.scenes, context);
        hasMoreScenes = response.hasMore;
        scenePage += 1;

        yield createSyncBatch(
          sceneDocs,
          { lastSyncTime: Date.now() },
          "scenes",
          hasMoreScenes
        );
      } else {
        hasMoreScenes = false;
      }
    }
  }
}
