import type {
  BacnetSyncBatch,
  BacnetSyncCursor,
  BacnetTransformContext,
} from "@openbeam/types/services/connectors/bacnet";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { BacnetClient } from "../client";
import { transformDevices } from "../transformers/device";
import { transformObjects } from "../transformers/object";
import { createSyncBatch } from "./utils";

interface IncrementalSyncOptions {
  cursor?: BacnetSyncCursor;
  discoveryTimeout?: number;
}

export async function* incrementalSync(
  client: BacnetClient,
  context: BacnetTransformContext,
  options: IncrementalSyncOptions = {}
): AsyncGenerator<BacnetSyncBatch<GenericDocument>, void, undefined> {
  const { cursor, discoveryTimeout } = options;
  const previousDeviceIds = new Set(cursor?.discoveredDevices ?? []);

  const devices = await client.discoverDevices(discoveryTimeout);
  const currentDeviceIds = devices.map((d) => d.deviceId);
  const newDevices = devices.filter((d) => !previousDeviceIds.has(d.deviceId));

  if (newDevices.length > 0) {
    const deviceDocs = await transformDevices(newDevices, context);
    yield createSyncBatch(
      deviceDocs,
      { lastSyncTime: Date.now(), discoveredDevices: currentDeviceIds },
      "new_devices",
      true
    );
  }

  const devicesToSync = newDevices.length > 0 ? newDevices : devices;

  for (const device of devicesToSync) {
    try {
      const objects = await client.readObjectList(
        device.address,
        device.deviceId
      );

      if (objects.length === 0) {
        continue;
      }

      const objectDocs = await transformObjects({
        objects,
        deviceId: device.deviceId,
        context,
      });

      const isLastDevice = device === devicesToSync.at(-1);

      yield createSyncBatch(
        objectDocs,
        { lastSyncTime: Date.now(), discoveredDevices: currentDeviceIds },
        "objects",
        !isLastDevice
      );
    } catch (err) {
      logger.warn(
        {
          deviceId: device.deviceId,
          deviceAddress: device.address,
          error: err instanceof Error ? err.message : String(err),
        },
        "Failed to read objects from device during incremental sync, skipping"
      );
    }
  }

  if (newDevices.length === 0 && devicesToSync.length === 0) {
    yield createSyncBatch(
      [],
      { lastSyncTime: Date.now(), discoveredDevices: currentDeviceIds },
      "no_changes",
      false
    );
  }
}
