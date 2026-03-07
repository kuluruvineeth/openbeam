import { describe, expect, it } from "bun:test";
import type {
  BacnetDevice,
  BacnetObject,
  BacnetTransformContext,
} from "@openbeam/types/services/connectors/bacnet";
import type { BacnetClient } from "../client";
import { fullSync } from "../sync/full";

function createMockDevice(overrides?: Partial<BacnetDevice>): BacnetDevice {
  return {
    address: "192.168.1.100",
    deviceId: 1001,
    maxApdu: 1476,
    segmentation: 0,
    vendorId: 5,
    objectName: "AHU-3",
    ...overrides,
  };
}

function createMockObject(overrides?: Partial<BacnetObject>): BacnetObject {
  return {
    type: 0,
    instance: 1,
    objectName: "Zone Temp",
    presentValue: 22.5,
    ...overrides,
  };
}

function createMockClient(options?: {
  devices?: BacnetDevice[];
  objectsByDevice?: Map<number, BacnetObject[]>;
  readObjectListError?: boolean;
}): BacnetClient {
  const devices = options?.devices ?? [createMockDevice()];
  const objectMap =
    options?.objectsByDevice ?? new Map([[1001, [createMockObject()]]]);

  return {
    connectorId: "conn_bacnet_1",
    discoverDevices: async () => devices,
    readObjectList: (_addr: string, deviceId: number) => {
      if (options?.readObjectListError) {
        throw new Error("Device unreachable");
      }
      return Promise.resolve(objectMap.get(deviceId) ?? []);
    },
    readObjectValue: async () => null,
    healthCheck: async () => true,
    close: () => {
      /* noop */
    },
  } as BacnetClient;
}

const baseContext: BacnetTransformContext = {
  connectorId: "conn_bacnet_1",
  connectorType: "BACNET",
  teamId: "team_1",
  workspaceId: "ws_1",
  networkInterface: "eth0",
  siteName: "Factory A",
};

describe("bacnet sync", () => {
  describe("fullSync", () => {
    it("yields device batch followed by object batch", async () => {
      const client = createMockClient();
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]?.stage).toBe("devices");
      expect(batches[1]?.stage).toBe("objects");
    });

    it("yields empty batch when no devices discovered", async () => {
      const client = createMockClient({ devices: [] });
      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(1);
      expect(batches[0]?.stage).toBe("devices");
      expect(batches[0]?.items).toHaveLength(0);
      expect(batches[0]?.hasMore).toBe(false);
    });

    it("skips devices with empty object lists", async () => {
      const client = createMockClient({
        devices: [
          createMockDevice({ deviceId: 1001 }),
          createMockDevice({ deviceId: 1002, address: "192.168.1.101" }),
        ],
        objectsByDevice: new Map([
          [1001, [createMockObject()]],
          [1002, []],
        ]),
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const objectBatches = batches.filter((b) => b.stage === "objects");
      expect(objectBatches).toHaveLength(1);
    });

    it("sets hasMore false on last device objects", async () => {
      const client = createMockClient({
        devices: [createMockDevice()],
        objectsByDevice: new Map([[1001, [createMockObject()]]]),
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const lastBatch = batches.at(-1);
      expect(lastBatch?.hasMore).toBe(false);
    });

    it("tracks discovered device IDs in cursor", async () => {
      const client = createMockClient({
        devices: [
          createMockDevice({ deviceId: 1001 }),
          createMockDevice({ deviceId: 1002, address: "192.168.1.101" }),
        ],
        objectsByDevice: new Map([
          [1001, [createMockObject()]],
          [1002, [createMockObject({ instance: 2 })]],
        ]),
      });

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      const deviceBatch = batches.find((b) => b.stage === "devices");
      expect(deviceBatch?.cursor.discoveredDevices).toEqual([1001, 1002]);
    });

    it("continues past individual device read errors", async () => {
      let callCount = 0;
      const client: BacnetClient = {
        connectorId: "conn_bacnet_1",
        discoverDevices: async () => [
          createMockDevice({ deviceId: 1001 }),
          createMockDevice({ deviceId: 1002, address: "192.168.1.101" }),
        ],
        readObjectList: (_addr: string, deviceId: number) => {
          callCount += 1;
          if (deviceId === 1001) {
            throw new Error("Timeout");
          }
          return Promise.resolve([createMockObject()]);
        },
        readObjectValue: async () => null,
        healthCheck: async () => true,
        close: () => {
          /* noop */
        },
      } as BacnetClient;

      const batches: unknown[] = [];
      for await (const batch of fullSync(client, baseContext)) {
        batches.push(batch);
      }

      expect(callCount).toBe(2);
      const objectBatches = batches.filter((b) => b.stage === "objects");
      expect(objectBatches).toHaveLength(1);
    });
  });
});
