import type {
  BacnetSyncBatch,
  BacnetTransformContext,
} from "@openbeam/types/services/connectors/bacnet";
import type { GenericDocument } from "@openbeam/vespa";
import { logger } from "../../lib/logger";
import type { BacnetClient } from "../client";
import { transformDevices } from "../transformers/device";
import { transformObjects } from "../transformers/object";
import { createSyncBatch } from "./utils";

interface FullSyncOptions {
  batchSize?: number;
  discoveryTimeout?: number;
}

export async function* fullSync(
  client: BacnetClient,
  context: BacnetTransformContext,
  options: FullSyncOptions = {}
): AsyncGenerator<BacnetSyncBatch<GenericDocument>, void, undefined> {
  const { discoveryTimeout } = options;

  const devices = await client.discoverDevices(discoveryTimeout);

  if (devices.length === 0) {
    yield createSyncBatch(
      [],
      { lastSyncTime: Date.now(), discoveredDevices: [] },
      "devices",
      false
    );
    return;
  }

  const discoveredDeviceIds = devices.map((d) => d.deviceId);

  const deviceDocs = await transformDevices(devices, context);
  yield createSyncBatch(
    deviceDocs,
    { lastSyncTime: Date.now(), discoveredDevices: discoveredDeviceIds },
    "devices",
    true
  );

  for (const device of devices) {
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

      const isLastDevice = device === devices.at(-1);

      yield createSyncBatch(
        objectDocs,
        { lastSyncTime: Date.now(), discoveredDevices: discoveredDeviceIds },
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
        "Failed to read objects from device, skipping"
      );
    }
  }
}
